import Skeleton from "@mui/material/Skeleton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";

export default function FleetTableSkeleton({
  columnCount,
  rowCount,
  rowHeight,
}: {
  columnCount: number;
  rowCount: number;
  rowHeight: number;
}) {
  return Array.from({ length: rowCount }, (_, row) => (
    <TableRow key={row} aria-hidden="true" sx={{ height: rowHeight }}>
      {Array.from({ length: columnCount }, (_, column) => (
        <TableCell key={column}>
          <Skeleton height={40} animation={false} />
        </TableCell>
      ))}
    </TableRow>
  ));
}
