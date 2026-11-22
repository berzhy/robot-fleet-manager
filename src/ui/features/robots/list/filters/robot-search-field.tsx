import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from "react";

import { appliedSearch, setRobotListFilters } from "../robot-list-url";

import { searchFieldId } from "./filter-fields";

const searchDebounceMs = 300;

export type SearchFieldHandle = {
  focus: () => void;
  /** Drops typed text, including text the debounce has not applied yet. */
  discardDraft: () => void;
};

export default function RobotSearchField({
  search,
  ref,
}: {
  /** The search the URL applies. */
  search: string | undefined;
  ref: Ref<SearchFieldHandle>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // The draft is what the user types; the URL holds the applied search.
  const [draft, setDraft] = useState(search ?? "");
  const [urlSearch, setUrlSearch] = useState(search);
  const [ownSearch, setOwnSearch] = useState(search);

  // Next re-renders URL readers a moment after replaceState, so the box may be
  // ahead of the URL. Only a URL search this box did not apply (a link or
  // Back) replaces what the user typed.
  if (search !== urlSearch) {
    setUrlSearch(search);
    if (search !== ownSearch) {
      setOwnSearch(search);
      setDraft(search ?? "");
    }
  }

  // Next keeps this page alive while hidden. Drop unsent text so it is not
  // applied on return; the box then reads the URL again.
  useLayoutEffect(
    () => () => {
      setDraft("");
      setUrlSearch(undefined);
      setOwnSearch(undefined);
    },
    [],
  );

  const [composing, setComposing] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    discardDraft: () => {
      setDraft("");
      setOwnSearch(undefined);
    },
  }));

  const applySearch = useEffectEvent((value: string) => {
    const applied = appliedSearch(value);
    if (applied !== ownSearch) {
      writeSearch(applied);
    }
  });

  useEffect(() => {
    if (composing) {
      return;
    }
    const timer = setTimeout(() => applySearch(draft), searchDebounceMs);

    // Writing the URL cancels a navigation already under way, so a click on a
    // link (the user is leaving) drops the pending search.
    function cancelOnLinkClick(event: MouseEvent) {
      if (event.target instanceof Element && event.target.closest("a[href]")) {
        clearTimeout(timer);
      }
    }
    document.addEventListener("click", cancelOnLinkClick, { capture: true });

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", cancelOnLinkClick, {
        capture: true,
      });
    };
  }, [draft, composing]);

  function writeSearch(value: string | undefined) {
    setOwnSearch(value);
    setRobotListFilters({ search: value });
  }

  function clearSearch() {
    inputRef.current?.focus();
    setDraft("");
    if (ownSearch !== undefined) {
      writeSearch(undefined);
    }
  }

  return (
    <TextField
      id={searchFieldId}
      inputRef={inputRef}
      label="Search robots"
      placeholder="Name, manufacturer, location…"
      size="small"
      variant="standard"
      value={draft}
      helperText={
        draft.trim().length === 1 ? "Enter at least 2 characters" : undefined
      }
      onChange={(event) => {
        const value = event.target.value;
        setDraft(value);
        if (!value) {
          clearSearch();
        }
      }}
      onCompositionStart={() => setComposing(true)}
      onCompositionEnd={() => setComposing(false)}
      sx={{ flex: "0 1 300px", minWidth: 200 }}
      slotProps={{
        htmlInput: { maxLength: 100 },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                aria-label="Clear search"
                disabled={!draft}
                onClick={clearSearch}
                sx={{ opacity: draft ? 1 : 0 }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
