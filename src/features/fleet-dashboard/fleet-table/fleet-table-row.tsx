"use client";
import Link from "@mui/material/Link";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";

import type { Robot } from "../types/robot";
import { formatActivity, formatBattery } from "../utils/robot-formatters";

export default function FleetTableRow({
  robot,
  rowHeight,
}: {
  robot: Robot;
  rowHeight: number;
}) {
  return (
    <TableRow
      hover
      sx={{
        position: "relative",
        cursor: "pointer",
        height: rowHeight,
        whiteSpace: "nowrap",
      }}
    >
      <TableCell component="th" scope="row">
        <Typography>{robot.name}</Typography>
        <Link
          component={NextLink}
          href={`/robots/${robot.id}`}
          aria-label={robot.name}
          underline="none"
          sx={{ position: "absolute", inset: 0 }}
        />
      </TableCell>
      <TableCell>{robot.manufacturer}</TableCell>
      <TableCell>
        {robot.site}
        {robot.area && (
          <Typography variant="body2" color="text.secondary">
            {robot.area}
          </Typography>
        )}
      </TableCell>
      <TableCell>{formatActivity(robot.activity)}</TableCell>
      <TableCell>{formatBattery(robot.batteryPercent)}</TableCell>
    </TableRow>
  );
}
