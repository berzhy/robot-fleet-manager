"use client";

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

import { appliedSearch } from "@/modules/robots/robot-list-params";

import useRobotListView, { setRobotListFilters } from "../use-robot-list-view";

import { searchFieldId } from "./filter-fields";

const searchDebounceMs = 300;

export type SearchFieldHandle = {
  focus: () => void;
  /** Drops typed text, including text the debounce has not applied yet. */
  reset: () => void;
};

export default function RobotSearchField({
  ref,
}: {
  ref: Ref<SearchFieldHandle>;
}) {
  const { filters } = useRobotListView();
  const inputRef = useRef<HTMLInputElement>(null);

  // The box holds what the user types; the URL holds the applied search.
  const [search, setSearch] = useState(filters.search ?? "");
  const [urlSearch, setUrlSearch] = useState(filters.search);
  const [ownSearch, setOwnSearch] = useState(filters.search);

  // Next re-renders URL readers a moment after replaceState, so the box may be
  // ahead of the URL. Only a URL search this box did not apply (a link or
  // Back) replaces what the user typed.
  if (filters.search !== urlSearch) {
    setUrlSearch(filters.search);
    if (filters.search !== ownSearch) {
      setOwnSearch(filters.search);
      setSearch(filters.search ?? "");
    }
  }

  // Next keeps this page alive while hidden. Drop unsent text so it is not
  // applied on return; the box then reads the URL again.
  useLayoutEffect(
    () => () => {
      setSearch("");
      setUrlSearch(undefined);
      setOwnSearch(undefined);
    },
    [],
  );

  const [composing, setComposing] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    reset: () => {
      setSearch("");
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
    const timer = setTimeout(() => applySearch(search), searchDebounceMs);

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
  }, [search, composing]);

  function writeSearch(value: string | undefined) {
    setOwnSearch(value);
    setRobotListFilters({ search: value });
  }

  function clearSearch() {
    inputRef.current?.focus();
    setSearch("");
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
      value={search}
      helperText={
        search.trim().length === 1 ? "Enter at least 2 characters" : undefined
      }
      onChange={(event) => {
        const value = event.target.value;
        setSearch(value);
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
                disabled={!search}
                onClick={clearSearch}
                sx={{ opacity: search ? 1 : 0 }}
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
