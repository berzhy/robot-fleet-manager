"use client";
import { robotProblemDetails } from "@/modules/robots/robot-problems";
import type { RobotAction } from "@/modules/robots/robot-actions";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";

import type { Robot } from "@/modules/robots/robot";
import { connectionStatus, reportAge } from "@/modules/telemetry/freshness";
import { ConnectionIndicator } from "../connection-status/connection-status";
import SearchHighlight from "./search-highlight";
import RobotActions from "./robot-actions";
import {
  formatActivity,
  formatRobotType,
  formatIntegrationType,
  formatBattery,
  formatAddedParts,
} from "../utils/robot-formatters";

export default function FleetTableRow({
  search,
  connectionAt,
  now,
  verifiedAt,
  unverified,
  onMenuOpenChange,
  robot,
  rowHeight,
  onAction,
  onDelete,
  adding,
}: {
  search?: string;
  adding: boolean;
  connectionAt?: number;
  now: number;
  verifiedAt: number;
  unverified: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  robot: Robot;
  rowHeight: number;
  onAction?: (robot: Robot, action: RobotAction) => void;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
  const connection = connectionStatus(
    robot.lastReceivedAt,
    connectionAt ?? (unverified || !now ? verifiedAt : now),
  );
  const showReportAge = connection === "Delayed" || connection === "Offline";
  const registered = formatAddedParts(robot.createdAt);
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
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Tooltip
            title={unverified ? `${connection} (unverified)` : connection}
          >
            <Box
              sx={{
                width: 16,
                flexShrink: 0,
                display: "flex",
                justifyContent: "center",
                fontSize: 12,
                position: "relative",
                zIndex: 1,
              }}
            >
              <ConnectionIndicator status={connection} />
            </Box>
          </Tooltip>
          <Box sx={{ minWidth: 0 }}>
            <Typography data-testid="robot-name" variant="body2">
              <SearchHighlight text={robot.name} search={search} />
            </Typography>
            <Typography
              data-testid="robot-manufacturer"
              variant="body2"
              color="textSecondary"
            >
              <SearchHighlight text={robot.manufacturer} search={search} />
            </Typography>
          </Box>
        </Stack>
        <Link
          data-testid="robot-link"
          component={NextLink}
          href={`/robots/${robot.id}`}
          aria-label={robot.name}
          underline="none"
          sx={{ position: "absolute", inset: 0 }}
        />
      </TableCell>
      <TableCell>
        <SearchHighlight text={robot.site} search={search} />
        {robot.area && (
          <Typography
            data-testid="robot-area"
            variant="body2"
            color="textSecondary"
          >
            <SearchHighlight text={robot.area} search={search} />
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
        <Typography data-testid="robot-connection" variant="body2">
          <SearchHighlight text={connection} search={search} />
          {unverified ? " (unverified)" : ""}
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
      <TableCell data-testid="robot-activity">
        <SearchHighlight
          text={formatActivity(robot.activity)}
          search={search}
        />
        {robot.problemCode && (
          <Typography variant="body2" color="textSecondary">
            <SearchHighlight
              text={robotProblemDetails[robot.problemCode].label}
              search={search}
            />
          </Typography>
        )}
      </TableCell>
      <TableCell data-testid="robot-battery">
        <SearchHighlight
          text={formatBattery(robot.batteryPercent)}
          search={search}
        />
      </TableCell>
      <TableCell data-testid="robot-type">
        <SearchHighlight text={formatRobotType(robot.type)} search={search} />
      </TableCell>
      <TableCell data-testid="robot-integration">
        <SearchHighlight
          text={formatIntegrationType(robot.integrationType)}
          search={search}
        />
      </TableCell>
      <TableCell>
        <time data-testid="robot-added-at" dateTime={robot.createdAt}>
          {registered.date}
          <Typography
            component="span"
            variant="body2"
            color="textSecondary"
            sx={{ display: "block" }}
          >
            {registered.time}
          </Typography>
        </time>
      </TableCell>
      <TableCell align="right" sx={{ position: "relative" }}>
        <RobotActions
          onOpenChange={onMenuOpenChange}
          disabled={adding}
          robot={robot}
          unverified={unverified}
          onDelete={onDelete}
          onAction={onAction}
        />
      </TableCell>
    </TableRow>
  );
}
