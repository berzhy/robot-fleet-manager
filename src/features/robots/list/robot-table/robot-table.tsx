"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { useLayoutEffect, useRef, type ReactNode } from "react";

import type { Robot } from "@/modules/robots/robot";
import type { RobotAction } from "@/modules/robots/robot-actions";

import type { RobotQueryState } from "../robot-query-state";
import FleetResultCount from "./fleet-result-count";
import RobotTableEmptyState from "./robot-table-empty-state";
import RobotTableErrorState from "./robot-table-error-state";
import RobotTableNoResultsState from "./robot-table-no-results-state";
import RobotTablePagination from "./robot-table-pagination";
import RobotTableRow from "./robot-table-row";
import RobotTableSkeleton from "./robot-table-skeleton";

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

  const isLoading = state.status === "loading";
  const hasNoResults = state.status === "success" && total === 0;
  const hasRobotsInFleet = fleetTotal !== undefined && fleetTotal > 0;

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
            {state.status === "success" &&
              state.robots.map((robot) => (
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
        {hasNoResults &&
          (hasRobotsInFleet ? (
            <RobotTableNoResultsState
              search={search}
              onClearSearch={onClearSearch}
              onClearFilters={onClearFilters}
            />
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
          <RobotTablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            onPageChange={onPageChange}
            disabled={adding || state.status !== "success"}
          />
        )}
        <FleetResultCount resultCount={resultCount} />
      </Box>
    </Paper>
  );
}
