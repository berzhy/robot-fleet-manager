import Stack from "@mui/material/Stack";
import type { RefObject } from "react";

import useRobotList from "../use-robot-list";
import useRobotListParams, { setRobotListFilters } from "../robot-list-url";

import AppliedFilterChips from "./applied-filter-chips";
import { toolbarFilterFields } from "./filter-fields";
import FilterSelect from "./filter-select";
import MoreFiltersButton from "./more-filters-button";
import RobotSearchField, { type SearchFieldHandle } from "./robot-search-field";

const toolbarFieldSx = { minWidth: 120, maxWidth: 260, flex: "1 1 150px" };

export default function RobotListFilters({
  searchFieldRef,
}: {
  searchFieldRef: RefObject<SearchFieldHandle | null>;
}) {
  const { filters } = useRobotListParams();
  const available = useRobotList().data?.filterOptions;

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <RobotSearchField ref={searchFieldRef} />
        <Stack
          direction="row"
          spacing={2}
          useFlexGap
          sx={{
            flexWrap: { xs: "wrap", md: "nowrap" },
            alignItems: "flex-end",
            justifyContent: "flex-end",
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          {toolbarFilterFields.map((field) => (
            <FilterSelect
              key={field.key}
              field={field}
              value={filters[field.key]}
              available={available}
              onChange={(value) => setRobotListFilters({ [field.key]: value })}
              sx={toolbarFieldSx}
            />
          ))}
          <MoreFiltersButton available={available} />
        </Stack>
      </Stack>
      <AppliedFilterChips
        onDiscardSearchDraft={() => searchFieldRef.current?.discardDraft()}
      />
    </Stack>
  );
}
