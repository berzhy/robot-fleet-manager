"use client";

import Box from "@mui/material/Box";
import type { IconButtonProps } from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import TablePagination from "@mui/material/TablePagination";
import Typography from "@mui/material/Typography";
import type { HTMLAttributes } from "react";

import { robotPageSizes } from "@/modules/robots/robot";
import type { RobotFilters } from "@/modules/robots/robot-filters";

import { useRobotWriteLock } from "../../api/robot-mutations";
import useRobotList from "../use-robot-list";
import useRobotListView, {
  setRobotListPage,
  setRobotListPageSize,
} from "../use-robot-list-view";

// MUI's pager toolbar height, kept while the pager is hidden (loading or no
// robots) so the footer does not jump.
const footerMinHeightPx = 52;

function robotWord(count: number) {
  return count === 1 ? "robot" : "robots";
}

export function formatResultCount(
  total: number,
  matchingTotal: number,
  filters: RobotFilters,
) {
  const { view, ...criteria } = filters;
  const hasCriteria = Object.values(criteria).some(
    (value) => value !== undefined,
  );

  const count =
    view !== "all"
      ? `${total} of ${matchingTotal} matching ${robotWord(matchingTotal)}`
      : hasCriteria
        ? `${matchingTotal} matching ${robotWord(matchingTotal)}`
        : `${total} ${robotWord(total)}`;

  return `${count} · Newest first`;
}

export default function RobotTableFooter() {
  const { filters, pageSize } = useRobotListView();
  const { status, snapshot, page } = useRobotList();
  const { isWritePending } = useRobotWriteLock();

  // The previous snapshot keeps the pager mounted while the next page loads.
  const total = snapshot?.total ?? 0;

  return (
    <Box
      sx={{
        minHeight: footerMinHeightPx,
        flexShrink: 0,
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
      }}
    >
      {total > 0 && (
        <TablePagination
          data-testid="fleet-pagination"
          component="div"
          count={total}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={robotPageSizes}
          onRowsPerPageChange={(event) =>
            setRobotListPageSize(Number(event.target.value))
          }
          // Stays enabled while a page loads: the previous page stays on screen,
          // and disabling the pressed button would drop keyboard focus.
          disabled={isWritePending}
          slotProps={{
            actions: {
              previousButton: {
                "data-testid": "fleet-previous-page",
              } as IconButtonProps,
              nextButton: {
                "data-testid": "fleet-next-page",
              } as IconButtonProps,
            },
            select: {
              SelectDisplayProps: {
                "data-testid": "fleet-page-size",
              } as HTMLAttributes<HTMLDivElement>,
            },
            displayedRows: () => ({ "data-testid": "fleet-page-summary" }),
            spacer: { sx: { display: "none" } },
            toolbar: {
              disableGutters: true,
              sx: { justifyContent: "flex-start", pl: 2 },
            },
          }}
          onPageChange={(_, nextPage) => setRobotListPage(nextPage)}
        />
      )}

      <Typography
        data-testid="fleet-result-count"
        variant="body2"
        color="textSecondary"
        sx={{ ml: "auto", pr: 2, fontVariantNumeric: "tabular-nums" }}
      >
        {status === "success" && snapshot ? (
          formatResultCount(total, snapshot.summary.all, filters)
        ) : (
          <Skeleton width={180} aria-hidden="true" />
        )}
      </Typography>
    </Box>
  );
}
