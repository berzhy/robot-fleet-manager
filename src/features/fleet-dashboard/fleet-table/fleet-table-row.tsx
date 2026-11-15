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
  formatRobotType,
  formatIntegrationType,
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
      data-testid={`robot-row-${robot.id}`}
      hover
      sx={{
        position: "relative",
        cursor: "pointer",
        height: rowHeight,
        whiteSpace: "nowrap",
      }}
    >
      <TableCell component="th" scope="row">
        <Typography data-testid="robot-name" variant="body2">
          {robot.name}
        </Typography>
        <Typography
          data-testid="robot-manufacturer"
          variant="body2"
          color="textSecondary"
        >
          {robot.manufacturer}
        </Typography>
        <Link
          data-testid="robot-link"
          component={NextLink}
          href={`/robots/${robot.id}`}
          aria-label={robot.name}
          underline="none"
          sx={{ position: "absolute", inset: 0 }}
        />
      </TableCell>
      <TableCell data-testid="robot-type">
        {formatRobotType(robot.type)}
      </TableCell>
      <TableCell data-testid="robot-integration">
        {formatIntegrationType(robot.integrationType)}
      </TableCell>
      <TableCell>
        {robot.site}
        {robot.area && (
          <Typography
            data-testid="robot-area"
            variant="body2"
            color="textSecondary"
          >
            {robot.area}
          </Typography>
        )}
      </TableCell>
      <TableCell data-testid="robot-activity">
        {formatActivity(robot.activity)}
      </TableCell>
      <TableCell data-testid="robot-battery">
        {formatBattery(robot.batteryPercent)}
      </TableCell>
      <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
        <Typography data-testid="robot-connection" variant="body2">
          <ConnectionStatus status={connection} unverified={unverified} />
        </Typography>
        {showReportAge && (
          <Typography
            data-testid="robot-report-age"
            variant="body2"
            color="textSecondary"
          >
            {reportAge(robot.lastReceivedAt, now || verifiedAt)}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <time data-testid="robot-added-at" dateTime={robot.createdAt}>
          {formatAdded(robot.createdAt)}
        </time>
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
