import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import { visuallyHidden } from "@mui/utils";

type RobotTableColumn = {
  label: string;
  widthPx: number;
  align?: "right";
  /** The list's only order, so the header says so instead of offering a sort. */
  isSortedNewestFirst?: boolean;
  /** The ⋮ buttons explain themselves; screen readers still get the name. */
  isLabelHidden?: boolean;
};

// Each width fits the column's usual text or header plus cell padding. Wider
// screens share the extra space across all columns in proportion.
const columns: RobotTableColumn[] = [
  { label: "Robot", widthPx: 172 },
  { label: "Location", widthPx: 148 },
  { label: "Connection", widthPx: 112 },
  { label: "Activity", widthPx: 170 },
  { label: "Battery", widthPx: 96 },
  { label: "Type", widthPx: 140 },
  { label: "Integration", widthPx: 104 },
  { label: "Registered", widthPx: 124, isSortedNewestFirst: true },
  { label: "Actions", widthPx: 64, align: "right", isLabelHidden: true },
];

export const robotTableColumnCount = columns.length;

// Narrower than this, the table scrolls sideways instead of squeezing columns.
export const robotTableMinWidthPx = columns.reduce(
  (total, column) => total + column.widthPx,
  0,
);

export default function RobotTableHead() {
  return (
    <>
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
              sortDirection={column.isSortedNewestFirst ? "desc" : false}
              align={column.align ?? "left"}
            >
              <ColumnLabel column={column} />
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
    </>
  );
}

function ColumnLabel({ column }: { column: RobotTableColumn }) {
  if (column.isLabelHidden) {
    return (
      <Box component="span" sx={visuallyHidden}>
        {column.label}
      </Box>
    );
  }

  if (column.isSortedNewestFirst) {
    return (
      <Tooltip title="Newest first" describeChild>
        <Box
          component="span"
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
        >
          {column.label}
          <ArrowDownwardIcon aria-hidden fontSize="inherit" />
        </Box>
      </Tooltip>
    );
  }

  return column.label;
}
