"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import { useRef } from "react";

import type { RobotQueryState } from "../types/robot";
import FleetTableRow from "./fleet-table-row";
import FleetTableSkeleton from "./fleet-table-skeleton";
import {
  FleetTableEmptyState,
  FleetTableErrorState,
} from "./fleet-table-states";

const columns = ["Robot", "Manufacturer", "Location", "Activity", "Battery"];
const pageSize = 20;
const rowHeight = 70;

export default function FleetTable({
  state,
  page,
  onPageChange,
  onRetry,
}: {
  state: RobotQueryState;
  page: number;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const sorted =
    state.status === "success"
      ? [...state.robots].sort(
          (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
        )
      : [];
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
                <TableCell key={column} scope="col">
                  {column}
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
            {sorted
              .slice(page * pageSize, (page + 1) * pageSize)
              .map((robot) => (
                <FleetTableRow
                  key={robot.id}
                  robot={robot}
                  rowHeight={rowHeight}
                />
              ))}
          </TableBody>
        </Table>
        {state.status === "success" && sorted.length === 0 && (
          <FleetTableEmptyState />
        )}
        {state.status === "error" && <FleetTableErrorState onRetry={onRetry} />}
      </TableContainer>
      <Box sx={{ minHeight: 52, flexShrink: 0, bgcolor: "background.default" }}>
        {sorted.length > 0 && (
          <TablePagination
            component="div"
            count={sorted.length}
            page={page}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[]}
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
