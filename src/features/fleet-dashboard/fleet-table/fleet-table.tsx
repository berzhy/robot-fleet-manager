"use client";

import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import { useRef } from "react";

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
  "Manufacturer",
  "Location",
  "Activity",
  "Battery",
  "Connection",
  "Added",
  "Actions",
];
const rowHeight = 70;

export default function FleetTable({
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
  onDelete,
  onAdd,
  adding,
}: {
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
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
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
                now={now}
                verifiedAt={verifiedAt}
                unverified={unverified}
                onMenuOpenChange={onMenuOpenChange}
                adding={adding}
                onDelete={onDelete}
                rowHeight={rowHeight}
              />
            ))}
          </TableBody>
        </Table>
        {state.status === "success" && total === 0 && (
          <FleetTableEmptyState onAdd={onAdd} adding={adding} />
        )}
        {state.status === "error" && <FleetTableErrorState onRetry={onRetry} />}
      </TableContainer>
      <Box sx={{ minHeight: 52, flexShrink: 0, bgcolor: "background.default" }}>
        {total > 0 && (
          <TablePagination
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
