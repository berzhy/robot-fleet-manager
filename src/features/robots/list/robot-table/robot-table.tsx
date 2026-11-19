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

import type { Robot, RobotPage } from "@/modules/robots/robot";
import type { RobotAction } from "@/modules/robots/robot-actions";
import type { RobotFilters } from "@/modules/robots/robot-filters";

import type { RobotListStatus } from "../use-robots";

import RobotTableEmptyState from "./robot-table-empty-state";
import RobotTableErrorState from "./robot-table-error-state";
import RobotTableFooter from "./robot-table-footer";
import RobotTableNoResultsState from "./robot-table-no-results-state";
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
  filters,
  snapshot,
  status,
  onClearFilters,
  onClearSearch,
  onRowFocusLost,
  unverified = false,
  page,
  pageSize,
  onPageSizeChange,
  onPageChange,
  onRetry,
  onAction,
  onDelete,
  onAdd,
  adding,
}: {
  toolbar?: ReactNode;
  filters: RobotFilters;
  snapshot?: RobotPage;
  status: RobotListStatus;
  onClearFilters?: () => void;
  onClearSearch?: () => void;
  onRowFocusLost?: () => void;
  unverified?: boolean;
  onAdd: (trigger: HTMLButtonElement) => void;
  adding: boolean;
  page: number;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onAction?: (robot: Robot, action: RobotAction) => void;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
  // Focus events from the portalled menu follow the React tree to its row.
  const focusedRowElement = useRef<HTMLTableRowElement | null>(null);

  useLayoutEffect(() => {
    const row = focusedRowElement.current;
    if (!row || row.isConnected) {
      return;
    }

    focusedRowElement.current = null;

    // Avoid stealing focus if another control has already received it.
    if (row.ownerDocument.activeElement === row.ownerDocument.body) {
      onRowFocusLost?.();
    }
  });

  const isLoading = status === "loading";
  const result = status === "success" ? snapshot : undefined;
  const { search } = filters;

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
          ) {
            focusedRowElement.current = null;
          }
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
            {result?.items.map((robot) => (
              <RobotTableRow
                key={robot.id}
                robot={robot}
                search={search}
                evaluatedAt={result.evaluatedAt}
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
        {result?.total === 0 &&
          (result.fleetTotal > 0 ? (
            <RobotTableNoResultsState
              search={search}
              onClearSearch={onClearSearch}
              onClearFilters={onClearFilters}
            />
          ) : (
            <RobotTableEmptyState onAdd={onAdd} adding={adding} />
          ))}
        {status === "error" && <RobotTableErrorState onRetry={onRetry} />}
      </TableContainer>
      <RobotTableFooter
        snapshot={snapshot}
        filters={filters}
        showResultCount={status === "success"}
        page={page}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        onPageChange={onPageChange}
        paginationDisabled={adding || status !== "success"}
      />
    </Paper>
  );
}
