import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";

import type { Robot } from "@/common/types";

import type { RobotReading } from "../../robot-reading";

import RobotTableHead, {
  robotTableColumnCount,
  robotTableMinWidthPx,
} from "./robot-table-head";
import RobotTableRow from "./robot-table-row";
import RobotTableSkeleton from "./robot-table-skeleton";
import useRowFocusRecovery from "./use-row-focus-recovery";

const rowHeightPx = 56;

export default function RobotTable({
  readings,
  search,
  isLoading,
  pageSize,
  onDelete,
  onFocusedRowRemoved,
}: {
  readings: RobotReading[];
  search?: string;
  isLoading: boolean;
  pageSize: number;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
  onFocusedRowRemoved: () => void;
}) {
  const { handleRowFocus, handleTableBlur } =
    useRowFocusRecovery(onFocusedRowRemoved);

  return (
    <Box sx={{ containerType: "inline-size" }}>
      <TableContainer
        onBlurCapture={handleTableBlur}
        aria-busy={isLoading}
        // Keeps the hidden Actions label (absolutely positioned) inside the
        // sideways scroll; otherwise it widens the page on phones.
        sx={{
          position: "relative",
          // Once the table fits the card it stops scrolling sideways, so its
          // header can stick to the page. A sideways scroll box would hold
          // the header itself.
          [`@container (min-width: ${robotTableMinWidthPx}px)`]: {
            overflowX: "visible",
          },
        }}
      >
        <Table
          data-testid="fleet-table"
          size="small"
          stickyHeader
          aria-label="Robot fleet"
          sx={{
            minWidth: robotTableMinWidthPx,
            // Columns keep their widths; longer text is cut short with "…".
            tableLayout: "fixed",
          }}
        >
          <RobotTableHead />
          <TableBody>
            {isLoading && !readings.length && (
              <RobotTableSkeleton
                columnCount={robotTableColumnCount}
                rowCount={pageSize}
                rowHeight={rowHeightPx}
              />
            )}
            {readings.map((reading) => (
              <RobotTableRow
                key={reading.robot.id}
                reading={reading}
                search={search}
                onFocusCapture={handleRowFocus}
                onDelete={onDelete}
                rowHeight={rowHeightPx}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
