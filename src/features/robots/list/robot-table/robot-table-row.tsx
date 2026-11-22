import Box from "@mui/material/Box";
import Link, { linkClasses } from "@mui/material/Link";
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
import type { RobotReading } from "@/modules/robots/robot-reading";

import { ConnectionIndicator } from "../../connection-status/connection-status";
import TimeAgo from "../../time-ago/time-ago";
import {
  batteryLevelColors,
  formatBattery,
} from "../../utils/robot-formatters";

import RobotTableRowMenu from "./robot-table-row-menu";
import SearchHighlight from "./search-highlight";

// Above the row link, so the pointer reaches the exact time in the tooltip.
const aboveRowLink = { position: "relative", zIndex: 1 } as const;

export default function RobotTableRow({
  reading,
  search,
  onFocusCapture,
  rowHeight,
  onDelete,
}: {
  reading: RobotReading;
  search?: string;
  onFocusCapture: FocusEventHandler<HTMLTableRowElement>;
  rowHeight: number;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
  const { robot, evaluatedAt, connection, isStale, unverified, batteryLevel } =
    reading;
  const connectionLabel = formatConnection(connection);

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
          {/* A plain div cannot carry a label; Connection names the state. */}
          <Tooltip
            title={
              unverified ? `${connectionLabel} (unverified)` : connectionLabel
            }
            describeChild
          >
            <Box
              sx={{
                width: 16,
                flexShrink: 0,
                display: "flex",
                justifyContent: "center",
                fontSize: 12,
                ...aboveRowLink,
              }}
            >
              <ConnectionIndicator status={connection} />
            </Box>
          </Tooltip>
          <Box sx={{ minWidth: 0 }}>
            <Typography data-testid="robot-name" variant="body2" noWrap>
              <SearchHighlight text={robot.name} search={search} />
            </Typography>
            <Typography
              data-testid="robot-manufacturer"
              variant="body2"
              color="textSecondary"
              noWrap
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
          // The cell may cut a long name short; hovering the row shows it all.
          title={robot.name}
          underline="none"
          sx={{
            position: "absolute",
            inset: 0,
            // The link covers the row, where the table clips a ring drawn
            // outside it; MUI insets the ring this way for Tabs and Cards.
            [`&.${linkClasses.focusVisible}`]: { outlineOffset: -2 },
          }}
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" noWrap>
          <SearchHighlight text={robot.site} search={search} />
        </Typography>
        {robot.area && (
          <Typography
            data-testid="robot-area"
            variant="body2"
            color="textSecondary"
            noWrap
          >
            <SearchHighlight text={robot.area} search={search} />
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
        <Typography data-testid="robot-connection" variant="body2">
          {/* A failed refresh is announced above the table, not on every row. */}
          <SearchHighlight text={connectionLabel} search={search} />
        </Typography>
        {isStale && robot.lastReceivedAt && (
          <Typography
            data-testid="robot-last-report"
            variant="body2"
            color="textSecondary"
          >
            <TimeAgo
              timestamp={robot.lastReceivedAt}
              now={evaluatedAt}
              sx={aboveRowLink}
            />
          </Typography>
        )}
      </TableCell>
      <TableCell data-testid="robot-activity">
        {/* Without fresh reports the activity is what the robot last said. */}
        <Typography
          variant="body2"
          color={isStale ? "textSecondary" : undefined}
        >
          {isStale && "Last: "}
          <SearchHighlight
            text={formatActivity(robot.activity)}
            search={search}
          />
        </Typography>
        {robot.problemCode && (
          <Typography variant="body2" color="textSecondary">
            <SearchHighlight
              text={robotProblemDetails[robot.problemCode].label}
              search={search}
            />
          </Typography>
        )}
      </TableCell>
      <TableCell
        data-testid="robot-battery"
        sx={{ color: batteryLevel && batteryLevelColors[batteryLevel] }}
      >
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
      <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
        <Typography variant="body2">
          <TimeAgo
            data-testid="robot-added-at"
            timestamp={robot.createdAt}
            now={evaluatedAt}
            sx={aboveRowLink}
          />
        </Typography>
      </TableCell>
      <TableCell align="right" sx={{ position: "relative" }}>
        <RobotTableRowMenu reading={reading} onDelete={onDelete} />
      </TableCell>
    </TableRow>
  );
}
