"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import type { IconButtonProps } from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import {
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { robotPageSizes, type Robot } from "@/modules/robots/robot";
import type { RobotAction } from "@/modules/robots/robot-actions";

import type { RobotQueryState } from "../robot-query-state";
import RobotTableRow from "./robot-table-row";
import RobotTableSkeleton from "./robot-table-skeleton";
import {
  RobotTableEmptyState,
  RobotTableErrorState,
} from "./robot-table-states";

const columns = [
  { label: "Robot", width: "20%" },
  { label: "Location", width: "12%" },
  { label: "Connection", width: "13%" },
  { label: "Activity", width: "13%" },
  { label: "Battery", width: "7%" },
  { label: "Type", width: "12%" },
  { label: "Integration", width: "10%" },
  { label: "Registered", width: "10%" },
  { label: "Actions", width: "64px" },
] as const;
const rowHeight = 70;

export default function RobotTable({
  toolbar,
  resultCount,
  search,
  fleetTotal,
  onClearFilters,
  onClearSearch,
  onRowFocusLost,
  evaluatedAt = 0,
  unverified = false,
  state,
  page,
  pageSize,
  onPageSizeChange,
  total,
  onPageChange,
  onRetry,
  onAction,
  onDelete,
  onAdd,
  adding,
}: {
  toolbar?: ReactNode;
  resultCount?: string;
  search?: string;
  fleetTotal?: number;
  onClearFilters?: () => void;
  onClearSearch?: () => void;
  onRowFocusLost?: () => void;
  evaluatedAt?: number;
  unverified?: boolean;
  onAdd: (trigger: HTMLButtonElement) => void;
  adding: boolean;
  state: RobotQueryState;
  page: number;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  total: number;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onAction?: (robot: Robot, action: RobotAction) => void;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
  // Focus events from the portalled menu follow the React tree to its row.
  const focusedRowElement = useRef<HTMLTableRowElement | null>(null);

  useLayoutEffect(() => {
    const row = focusedRowElement.current;
    if (!row || row.isConnected) return;

    focusedRowElement.current = null;

    // Avoid stealing focus if another control has already received it.
    if (row.ownerDocument.activeElement === row.ownerDocument.body) {
      onRowFocusLost?.();
    }
  });

  const items = state.status === "success" ? state.robots : [];
  const isLoading = state.status === "loading";

  return (
    <Paper
      elevation={2}
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {toolbar && (
        <Box sx={{ flexShrink: 0, px: 2, pt: 2, pb: 2.5 }}>{toolbar}</Box>
      )}
      <TableContainer
        onBlurCapture={(event) => {
          if (
            event.relatedTarget instanceof HTMLElement &&
            !event.currentTarget.contains(event.relatedTarget)
          )
            focusedRowElement.current = null;
        }}
        aria-busy={isLoading}
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflowX: "auto",
          overflowY: isLoading ? "hidden" : "auto",
          overscrollBehaviorY: "none",
        }}
      >
        <Table
          data-testid="fleet-table"
          stickyHeader
          aria-label="Robot fleet"
          sx={{
            minWidth: 900,
            flexShrink: 0,
          }}
        >
          <colgroup>
            {columns.map((column) => (
              <Box
                component="col"
                key={column.label}
                sx={{
                  width: column.width,
                }}
              />
            ))}
          </colgroup>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.label}
                  scope="col"
                  aria-sort={
                    column.label === "Registered" ? "descending" : undefined
                  }
                  align={column.label === "Actions" ? "right" : "left"}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <RobotTableSkeleton
                columnCount={columns.length}
                rowCount={pageSize}
                rowHeight={rowHeight}
              />
            )}
            {items.map((robot) => (
              <RobotTableRow
                key={robot.id}
                robot={robot}
                search={search}
                evaluatedAt={evaluatedAt}
                unverified={unverified}
                onFocusCapture={(event) => {
                  focusedRowElement.current = event.currentTarget;
                }}
                adding={adding}
                onDelete={onDelete}
                onAction={onAction}
                rowHeight={rowHeight}
              />
            ))}
          </TableBody>
        </Table>
        {state.status === "success" &&
          total === 0 &&
          (fleetTotal !== undefined && fleetTotal > 0 ? (
            <Stack
              sx={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                p: 3,
              }}
              spacing={2}
            >
              {search ? (
                <>
                  <Typography
                    role="status"
                    sx={{ overflowWrap: "anywhere", textAlign: "center" }}
                  >
                    {`No robots match “${search}”.`}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: "center" }}
                  >
                    Search matches name, ID, manufacturer, location, area, type,
                    integration, activity, problem, connection and battery.
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button onClick={onClearSearch}>Clear search</Button>
                    <Button onClick={onClearFilters}>Clear filters</Button>
                  </Stack>
                </>
              ) : (
                <>
                  <Typography role="status">
                    No robots match these filters.
                  </Typography>
                  <Button onClick={onClearFilters}>Clear filters</Button>
                </>
              )}
            </Stack>
          ) : (
            <RobotTableEmptyState onAdd={onAdd} adding={adding} />
          ))}
        {state.status === "error" && <RobotTableErrorState onRetry={onRetry} />}
      </TableContainer>
      <Box
        sx={{
          minHeight: 52,
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
              onPageSizeChange(Number(event.target.value))
            }
            disabled={adding || state.status !== "success"}
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
            onPageChange={(_, nextPage) => onPageChange(nextPage)}
          />
        )}
        <Typography
          data-testid="fleet-result-count"
          variant="body2"
          color="text.secondary"
          sx={{ ml: "auto", pr: 2, fontVariantNumeric: "tabular-nums" }}
        >
          {resultCount ?? <Skeleton width={180} aria-hidden="true" />}
        </Typography>
      </Box>
    </Paper>
  );
}
