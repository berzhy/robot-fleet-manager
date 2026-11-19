"use client";

import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import type { FocusEventHandler } from "react";

import {
  formatActivity,
  formatConnection,
  formatIntegrationType,
  formatRobotType,
} from "@/modules/robots/robot-labels";
import { robotProblemDetails } from "@/modules/robots/robot-problems";
import type { Robot } from "@/modules/robots/robot";
import { connectionStatus } from "@/modules/telemetry/freshness";

import { ConnectionIndicator } from "../../connection-status/connection-status";
import {
  formatAddedParts,
  formatBattery,
  formatRobotTimestamp,
} from "../../utils/robot-formatters";

import RobotTableRowMenu from "./robot-table-row-menu";
import SearchHighlight from "./search-highlight";

export default function RobotTableRow({
  search,
  evaluatedAt,
  unverified,
  onFocusCapture,
  robot,
  rowHeight,
  onDelete,
}: {
  search?: string;
  evaluatedAt: number;
  unverified: boolean;
  onFocusCapture: FocusEventHandler<HTMLTableRowElement>;
  robot: Robot;
  rowHeight: number;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
  const connection = connectionStatus(robot.lastReceivedAt, evaluatedAt);
  const connectionLabel = formatConnection(connection);
  const showLastReport = connection === "delayed" || connection === "offline";
  const registered = formatAddedParts(robot.createdAt);

  return (
    <TableRow
      data-testid={`robot-row-${robot.id}`}
      onFocusCapture={onFocusCapture}
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
            title={
              unverified ? `${connectionLabel} (unverified)` : connectionLabel
            }
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
          <SearchHighlight text={connectionLabel} search={search} />
          {unverified ? " (unverified)" : ""}
        </Typography>
        {showLastReport && robot.lastReceivedAt && (
          <Typography
            data-testid="robot-last-report"
            variant="body2"
            color="textSecondary"
          >
            Last report{" "}
            <time dateTime={robot.lastReceivedAt}>
              {formatRobotTimestamp(robot.lastReceivedAt)}
            </time>
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
        <Typography
          component="time"
          variant="body2"
          data-testid="robot-added-at"
          dateTime={robot.createdAt}
          sx={{ fontVariantNumeric: "tabular-nums" }}
        >
          {registered.date}
          <Typography
            component="span"
            variant="caption"
            color="textSecondary"
            sx={{ display: "block" }}
          >
            {registered.time}
          </Typography>
        </Typography>
      </TableCell>
      <TableCell align="right" sx={{ position: "relative" }}>
        <RobotTableRowMenu
          robot={robot}
          evaluatedAt={evaluatedAt}
          unverified={unverified}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
}
