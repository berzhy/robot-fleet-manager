import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import { useTheme, type SxProps, type Theme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import type { ReactNode } from "react";

import cleaning from "@/ui/assets/robots/cleaning.webp";
import delivery from "@/ui/assets/robots/delivery.webp";
import inspection from "@/ui/assets/robots/inspection.webp";
import security from "@/ui/assets/robots/security.webp";
import {
  formatActivity,
  integrationTypeLabels,
  robotProblemLabels,
  robotTypeLabels,
} from "@/common/labels";
import type { Robot, RobotProblemCode } from "@/common/types";
import { useNotifications } from "@/ui/notifications/notification-provider";
import { monospaceFontFamily } from "@/ui/theme/theme";

import ConnectionStatus from "../connection-status";
import type { RobotReading } from "../robot-reading";
import TimeAgo from "../time-ago";
import { batteryLevelColors, formatBattery } from "../battery";

import BatteryIcon from "./battery-icon";

const illustrations = { cleaning, delivery, inspection, security };
// The webp files' own size; outside Next's bundler an import is a bare URL.
const illustrationSizePx = 640;

const pictureWidthPx = { small: 160, medium: 220, large: 260 };
// Fits "Last reported location" and "Needs attention" on one line.
const valueWidthPx = 160;

const problemGuidance = {
  "path-blocked": "Clear the obstruction before retrying activity.",
  "position-lost": "Check the robot’s position before retrying activity.",
  "sensor-obstructed": "Clear the sensor obstruction before retrying activity.",
} satisfies Record<RobotProblemCode, string>;

/**
 * Who the robot is, how it is doing and what it can do, in one card. Narrow
 * screens put the picture above the rest, and below lg the actions go under
 * the information.
 */
export default function RobotSummary({
  reading,
  missing,
  actions,
}: {
  reading: RobotReading;
  missing: boolean;
  actions: ReactNode;
}) {
  const { breakpoints } = useTheme();
  const { robot } = reading;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          sm: "auto minmax(0, 1fr)",
          lg: "auto minmax(0, 1fr) auto",
        },
        columnGap: 5,
        rowGap: 3,
      }}
    >
      <Box
        sx={{
          width: {
            xs: pictureWidthPx.small,
            md: pictureWidthPx.medium,
            lg: pictureWidthPx.large,
          },
          justifySelf: { xs: "center", sm: "start" },
          p: 2,
          bgcolor: "action.hover",
          borderRadius: 1,
        }}
      >
        <Image
          src={illustrations[robot.type]}
          alt=""
          loading="eager"
          width={illustrationSizePx}
          height={illustrationSizePx}
          sizes={`(min-width: ${breakpoints.values.lg}px) ${pictureWidthPx.large}px, (min-width: ${breakpoints.values.md}px) ${pictureWidthPx.medium}px, ${pictureWidthPx.small}px`}
          // As tall as the information beside it, whole and centred.
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </Box>
      <Box>
        <Typography
          component="h1"
          variant="h4"
          sx={{ overflowWrap: "anywhere" }}
        >
          {robot.name}
        </Typography>
        <Typography color="textSecondary" sx={{ mt: 0.5 }}>
          {robot.manufacturer} · {robotTypeLabels[robot.type]}
        </Typography>
        {missing ? (
          <Alert data-testid="robot-unavailable" severity="info" sx={{ mt: 3 }}>
            Robot is no longer available.
          </Alert>
        ) : (
          <>
            {/* The divider ends where the values do. */}
            <Box sx={{ width: "fit-content", maxWidth: 1 }}>
              <LiveValues reading={reading} />
              <Divider sx={{ mt: 3 }} />
            </Box>
            <Facts robot={robot} evaluatedAt={reading.evaluatedAt} />
          </>
        )}
      </Box>
      {!missing && (
        <Box sx={{ gridColumn: { sm: 2, lg: 3 }, gridRow: { lg: 1 } }}>
          {actions}
        </Box>
      )}
    </Paper>
  );
}

/** Telemetry, labelled as last reported once it may be out of date. */
function LiveValues({ reading }: { reading: RobotReading }) {
  const { robot, evaluatedAt, isStale, unverified, isLastKnown } = reading;
  const { connection, batteryLevel } = robot;
  const { problemCode } = robot;

  function label(name: string) {
    return isLastKnown ? `Last reported ${name.toLowerCase()}` : name;
  }

  return (
    <>
      <Box
        component="dl"
        sx={{
          m: 0,
          mt: 3,
          display: "flex",
          flexWrap: "wrap",
          columnGap: 3,
          rowGap: 2,
        }}
      >
        <Field label="Connection" sx={{ width: valueWidthPx }}>
          <Typography
            component="dd"
            variant="h6"
            data-testid="robot-connection"
          >
            <ConnectionStatus status={connection} unverified={unverified} />
          </Typography>
          {(isStale || !robot.lastReceivedAt) && (
            <Typography
              component="dd"
              variant="body2"
              color="textSecondary"
              data-testid="robot-last-report"
            >
              {robot.lastReceivedAt ? (
                <>
                  Last report{" "}
                  <TimeAgo
                    timestamp={robot.lastReceivedAt}
                    now={evaluatedAt}
                    tabIndex={0}
                  />
                </>
              ) : (
                "No reports yet"
              )}
            </Typography>
          )}
        </Field>
        <Field label={label("Location")} sx={{ width: valueWidthPx }}>
          <Typography component="dd" variant="h6" data-testid="robot-location">
            {robot.area ?? "Unknown"}
          </Typography>
          <Typography component="dd" variant="body2" color="textSecondary">
            {robot.site}
          </Typography>
        </Field>
        <Field label={label("Activity")} sx={{ width: valueWidthPx }}>
          <Typography component="dd" variant="h6" data-testid="robot-activity">
            {formatActivity(robot.activity)}
          </Typography>
        </Field>
        <Field label={label("Battery")}>
          <Typography
            component="dd"
            variant="h6"
            data-testid="robot-battery"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              color: batteryLevel && batteryLevelColors[batteryLevel],
            }}
          >
            {formatBattery(robot.batteryPercent)}
            <BatteryIcon
              percent={robot.batteryPercent}
              isCharging={robot.activity === "charging"}
            />
          </Typography>
        </Field>
      </Box>
      {problemCode && (
        <Alert
          severity="warning"
          // As wide as the values above, however long its text.
          sx={{ mt: 3, contain: "inline-size" }}
        >
          {isLastKnown && "Last reported problem: "}
          {robotProblemLabels[problemCode]}. {problemGuidance[problemCode]}
        </Alert>
      )}
    </>
  );
}

/** What the robot is, which does not change between reports. */
function Facts({ robot, evaluatedAt }: { robot: Robot; evaluatedAt: number }) {
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        mt: 3,
        display: "flex",
        flexWrap: "wrap",
        columnGap: 6,
        rowGap: 2,
      }}
    >
      <Field label="Integration">
        <Typography component="dd" variant="subtitle2">
          {integrationTypeLabels[robot.integrationType]}
        </Typography>
      </Field>
      <Field label="Registered">
        <Typography component="dd" variant="subtitle2">
          <TimeAgo timestamp={robot.createdAt} now={evaluatedAt} tabIndex={0} />
        </Typography>
      </Field>
      <Field label="ID">
        <Typography
          component="dd"
          variant="subtitle2"
          sx={{ display: "flex", alignItems: "center" }}
        >
          <Box
            component="span"
            sx={{
              minWidth: 0,
              overflowWrap: "anywhere",
              fontFamily: monospaceFontFamily,
            }}
          >
            {robot.id}
          </Box>
          <CopyIdButton id={robot.id} />
        </Typography>
      </Field>
    </Box>
  );
}

/** A labelled value, or several lines of one, in a definition list. */
function Field({
  label,
  sx,
  children,
}: {
  label: string;
  sx?: SxProps<Theme>;
  children: ReactNode;
}) {
  return (
    <Box sx={sx}>
      <Typography component="dt" variant="body2" color="textSecondary">
        {label}
      </Typography>
      {children}
    </Box>
  );
}

/** IDs are for pasting into tickets and logs, not for reading. */
function CopyIdButton({ id }: { id: string }) {
  const notifications = useNotifications();

  async function copyId() {
    try {
      await navigator.clipboard.writeText(id);
      notifications.show({ severity: "success", message: "Robot ID copied." });
    } catch {
      // The clipboard needs a secure page and the browser's permission.
      notifications.show({
        severity: "error",
        message: "Couldn't copy the robot ID.",
      });
    }
  }

  return (
    <Tooltip title="Copy ID">
      <IconButton
        size="small"
        aria-label="Copy robot ID"
        onClick={() => void copyId()}
        sx={{ ml: 0.5 }}
      >
        <ContentCopyIcon fontSize="inherit" />
      </IconButton>
    </Tooltip>
  );
}
