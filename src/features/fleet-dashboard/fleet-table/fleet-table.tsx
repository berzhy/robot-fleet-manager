"use client";
import type { RobotAction } from "@/modules/robots/robot-actions";

import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { IconButtonProps } from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import {
  useRef,
  useLayoutEffect,
  type RefObject,
  type HTMLAttributes,
} from "react";

import { robotPageSizes, type Robot } from "@/modules/robots/robot";
import type { RobotQueryState } from "../types/robot-query-state";
import FleetTableRow from "./fleet-table-row";
import FleetTableSkeleton from "./fleet-table-skeleton";
import {
  FleetTableEmptyState,
  FleetTableErrorState,
} from "./fleet-table-states";

const columns = [
  "Robot",
  "Type",
  "Added",
  "Location",
  "Connection",
  "Activity",
  "Battery",
  "Integration",
  "Actions",
];
const rowHeight = 70;

export default function FleetTable({
  search,
  fleetTotal,
  onClearFilters,
  headingRef,
  now = 0,
  verifiedAt = now,
  unverified = false,
  onMenuOpenChange,
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
  search?: string;
  fleetTotal?: number;
  onClearFilters?: () => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  now?: number;
  verifiedAt?: number;
  unverified?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const focusedRowElement = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const focused = focusedRowElement.current;
    if (focused && !focused.isConnected) {
      headingRef?.current?.focus();
      focusedRowElement.current = null;
    }
  });
  const items = state.status === "success" ? state.robots : [];
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
      <TableContainer
        ref={containerRef}
        onFocusCapture={(event) => {
          focusedRowElement.current = event.target.closest("tbody tr")
            ? event.target
            : null;
        }}
        onBlurCapture={(event) => {
          if (
            event.relatedTarget instanceof HTMLElement &&
            !event.currentTarget.contains(event.relatedTarget)
          )
            focusedRowElement.current = null;
        }}
        aria-busy={state.status === "loading"}
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          overscrollBehaviorY: "none",
        }}
      >
        <Table
          data-testid="fleet-table"
          stickyHeader
          aria-label="Robot fleet"
          sx={{
            minWidth: 650,
            flexShrink: 0,
          }}
        >
          <TableHead ref={headerRef}>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column}
                  scope="col"
                  aria-sort={column === "Added" ? "descending" : undefined}
                  align={column === "Actions" ? "right" : "left"}
                >
                  {column === "Added" ? (
                    <Stack
                      component="span"
                      direction="row"
                      spacing={0.5}
                      sx={{ alignItems: "center" }}
                    >
                      <span>{column}</span>
                      <ArrowDownwardIcon fontSize="small" color="action" />
                    </Stack>
                  ) : (
                    column
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {state.status === "loading" && (
              <FleetTableSkeleton
                containerRef={containerRef}
                headerRef={headerRef}
                columnCount={columns.length}
                rowHeight={rowHeight}
              />
            )}
            {items.map((robot) => (
              <FleetTableRow
                key={robot.id}
                robot={robot}
                search={search}
                now={now}
                connectionAt={verifiedAt}
                verifiedAt={verifiedAt}
                unverified={unverified}
                onMenuOpenChange={onMenuOpenChange}
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
              <Typography role="status">
                No robots match these filters.
              </Typography>
              <Button onClick={onClearFilters}>Clear filters</Button>
            </Stack>
          ) : (
            <FleetTableEmptyState onAdd={onAdd} adding={adding} />
          ))}
        {state.status === "error" && <FleetTableErrorState onRetry={onRetry} />}
      </TableContainer>
      <Box sx={{ minHeight: 52, flexShrink: 0, bgcolor: "background.default" }}>
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
      </Box>
    </Paper>
  );
}
