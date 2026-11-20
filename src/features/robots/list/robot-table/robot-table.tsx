"use client";

import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import { visuallyHidden } from "@mui/utils";
import { useLayoutEffect, useRef, type ReactNode } from "react";

import type { Robot } from "@/modules/robots/robot";

import useRobotList from "../use-robot-list";
import useRobotListView from "../use-robot-list-view";

import RobotTableEmptyState from "./robot-table-empty-state";
import RobotTableErrorState from "./robot-table-error-state";
import RobotTableFooter from "./robot-table-footer";
import RobotTableNoResultsState from "./robot-table-no-results-state";
import RobotTableRow from "./robot-table-row";
import RobotTableSkeleton from "./robot-table-skeleton";

// Each width fits the column's longest possible text, or its header, plus
// the cell padding; Robot fits a generated name such as "Robot 7F37424D"
// beside its dot. On wider screens the fixed layout shares the extra space
// across all columns in proportion, so no single column takes all of it.
const columns = [
  { label: "Robot", widthPx: 172 },
  { label: "Location", widthPx: 148 },
  { label: "Connection", widthPx: 112 },
  { label: "Activity", widthPx: 170 },
  { label: "Battery", widthPx: 96 },
  { label: "Type", widthPx: 140 },
  { label: "Integration", widthPx: 104 },
  { label: "Registered", widthPx: 124 },
  { label: "Actions", widthPx: 64 },
] as const;

// Narrower than this, the table scrolls sideways instead of squeezing columns.
const tableMinWidthPx = columns.reduce(
  (total, column) => total + column.widthPx,
  0,
);

const rowHeight = 56;

export default function RobotTable({
  toolbar,
  onFocusSearch,
  onAdd,
  adding,
  onDelete,
}: {
  toolbar?: ReactNode;
  onFocusSearch: () => void;
  onAdd: (trigger: HTMLButtonElement) => void;
  adding: boolean;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
  const { filters, pageSize } = useRobotListView();
  const { status, snapshot, refresh, refreshFailed } = useRobotList();

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
      onFocusSearch();
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
          size="small"
          stickyHeader
          aria-label="Robot fleet"
          sx={{
            minWidth: tableMinWidthPx,
            // Columns keep their widths; longer text is cut short with "…".
            tableLayout: "fixed",
            flexShrink: 0,
          }}
        >
          <colgroup>
            {columns.map((column) => (
              <Box
                component="col"
                key={column.label}
                sx={{ width: column.widthPx }}
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
                  {column.label === "Registered" ? (
                    // The only order the list has, so it needs no control.
                    <Tooltip title="Newest first" describeChild>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        {column.label}
                        <ArrowDownwardIcon aria-hidden fontSize="inherit" />
                      </Box>
                    </Tooltip>
                  ) : column.label === "Actions" ? (
                    // The ⋮ buttons explain themselves; screen readers still
                    // get the column name.
                    <Box component="span" sx={visuallyHidden}>
                      {column.label}
                    </Box>
                  ) : (
                    column.label
                  )}
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
                unverified={refreshFailed}
                onFocusCapture={(event) => {
                  focusedRowElement.current = event.currentTarget;
                }}
                onDelete={onDelete}
                rowHeight={rowHeight}
              />
            ))}
          </TableBody>
        </Table>
        {result?.total === 0 &&
          (result.fleetTotal > 0 ? (
            <RobotTableNoResultsState onCleared={onFocusSearch} />
          ) : (
            <RobotTableEmptyState onAdd={onAdd} adding={adding} />
          ))}
        {status === "error" && <RobotTableErrorState onRetry={refresh} />}
      </TableContainer>
      <RobotTableFooter />
    </Paper>
  );
}
