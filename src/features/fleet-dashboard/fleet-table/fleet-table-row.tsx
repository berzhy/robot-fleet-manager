"use client";
import Link from "@mui/material/Link";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";

import type { Robot } from "@/modules/robots/robot";
import { connectionStatus, reportAge } from "@/modules/telemetry/freshness";
import ConnectionStatus from "../connection-status/connection-status";
import RobotActions from "./robot-actions";
import {
  formatActivity,
  formatBattery,
  formatAdded,
} from "../utils/robot-formatters";

export default function FleetTableRow({
  now,
  verifiedAt,
  unverified,
  onMenuOpenChange,
  robot,
  rowHeight,
  onDelete,
  adding,
}: {
  adding: boolean;
  now: number;
  verifiedAt: number;
  unverified: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  robot: Robot;
  rowHeight: number;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
  const connection = connectionStatus(
    robot.lastReceivedAt,
    unverified || !now ? verifiedAt : now,
  );
  const showReportAge = connection === "Delayed" || connection === "Offline";
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
        <Typography variant="body2">{robot.name}</Typography>
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
      <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
        <Typography variant="body2">
          <ConnectionStatus status={connection} unverified={unverified} />
        </Typography>
        {showReportAge && (
          <Typography variant="body2" color="text.secondary">
            {reportAge(robot.lastReceivedAt, now || verifiedAt)}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <time dateTime={robot.createdAt}>{formatAdded(robot.createdAt)}</time>
      </TableCell>
      <TableCell align="right" sx={{ position: "relative" }}>
        <RobotActions
          onOpenChange={onMenuOpenChange}
          disabled={adding}
          robot={robot}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
}
