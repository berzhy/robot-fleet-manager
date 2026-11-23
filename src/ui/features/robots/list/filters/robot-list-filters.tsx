import Stack from "@mui/material/Stack";
import type { RobotFilters } from "@/common/schemas";
import type { FilterOptions } from "@/common/types";

import { setRobotListFilters } from "../robot-list-url";

import AppliedFilterChips from "./applied-filter-chips";
import { toolbarFilterFields } from "./filter-fields";
import FilterSelect from "./filter-select";
import MoreFiltersButton from "./more-filters-button";
import RobotSearchField from "./robot-search-field";

const toolbarFieldSx = { minWidth: 120, maxWidth: 260, flex: "1 1 150px" };

export default function RobotListFilters({
  filters,
  available,
}: {
  filters: RobotFilters;
  available: FilterOptions | undefined;
}) {
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
        <RobotSearchField search={filters.search} />
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
          <MoreFiltersButton filters={filters} available={available} />
        </Stack>
      </Stack>
      <AppliedFilterChips filters={filters} />
    </Stack>
  );
}
