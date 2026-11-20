"use client";

import Battery1BarIcon from "@mui/icons-material/Battery1Bar";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import type SvgIcon from "@mui/material/SvgIcon";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import { fleetViews, type RobotFilters } from "@/modules/robots/robot-filters";
import {
  criticalBatteryPercent,
  lowBatteryPercent,
} from "@/modules/robots/robot";
import { delayedReportMaxAgeMs } from "@/modules/telemetry/freshness";

import useRobotList from "../use-robot-list";
import useRobotListView, { setRobotListFilters } from "../use-robot-list-view";

import { fleetViewLabels } from "./filter-fields";

type ProblemView = Exclude<RobotFilters["view"], "all">;

const explanations = {
  all: "All robots within the selected location, manufacturer, type and integration.",
  "needs-attention": `Offline, a reported problem, or critical battery at or below ${criticalBatteryPercent}% while not charging.`,
  offline: `Last report received more than ${delayedReportMaxAgeMs / 1000} seconds ago. Robots with no reports are Unknown.`,
  "low-battery": `Last-reported battery at or below ${lowBatteryPercent}%, including Returning but excluding Charging.`,
};

// Lifted off the table card by a soft shadow, so the tiles read as things to
// press. In dark mode a lower elevation would make them darker than the card.
const tileElevation = 2;

/** Faint shapes that name each kind of problem; the total needs none. */
const problemIcons = {
  "needs-attention": ErrorOutlineOutlinedIcon,
  offline: CloudOffOutlinedIcon,
  "low-battery": Battery1BarIcon,
} satisfies Record<ProblemView, typeof SvgIcon>;

const problemIconSizePx = 44;
const largeProblemIconSizePx = 52;
// Below this width the tiles leave too little room beside the text for the
// large icon. No MUI breakpoint sits here (lg is 1200, xl is 1536).
const largeProblemIconMinWidthPx = 1360;
const quietIconOpacity = 0.09;
// Red needs more strength than grey to read as red, more so on dark tiles.
const alertIconOpacity = 0.28;
const darkAlertIconOpacity = 0.42;

export default function RobotStatusFilters() {
  const { filters } = useRobotListView();
  const { status, snapshot } = useRobotList();
  const summary = snapshot?.summary;
  const isUpdating = status === "loading";

  return (
    <Box
      role="group"
      aria-label="Robot status filters"
      aria-busy={isUpdating}
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
        gap: 2,
        flexShrink: 0,
      }}
    >
      {fleetViews.map((view) => {
        const selected = filters.view === view;
        return (
          <Card key={view} elevation={tileElevation}>
            <Tooltip
              title={explanations[view]}
              // Below the tile: above it, the tooltip covers the Add robot button.
              placement="bottom"
              // Help on demand, not a popup every time the pointer crosses a tile.
              enterDelay={700}
              enterNextDelay={700}
              describeChild
            >
              <CardActionArea
                data-view={view}
                aria-pressed={selected}
                aria-label={fleetViewLabels[view]}
                onClick={() => {
                  if (!selected) {
                    setRobotListFilters({ view });
                  }
                }}
                sx={[
                  {
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    py: 1.25,
                    px: 2,
                  },
                  selected && { bgcolor: "action.selected" },
                ]}
              >
                {view !== "all" && (
                  <ProblemIcon
                    view={view}
                    isAlerting={
                      view === "needs-attention" && Boolean(summary?.[view])
                    }
                  />
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: "center",
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    variant="h5"
                    component="span"
                    sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
                  >
                    {summary ? (
                      summary[view]
                    ) : status === "error" ? (
                      "–"
                    ) : (
                      <Skeleton width={40} />
                    )}
                  </Typography>
                  <Typography variant="subtitle2" component="span">
                    {fleetViewLabels[view]}
                  </Typography>
                </Stack>
              </CardActionArea>
            </Tooltip>
          </Card>
        );
      })}
    </Box>
  );
}

/** Red marks Needs attention while it has robots; the others stay neutral. */
function ProblemIcon({
  view,
  isAlerting,
}: {
  view: ProblemView;
  isAlerting: boolean;
}) {
  const Icon = problemIcons[view];

  return (
    <Icon
      aria-hidden
      sx={[
        (theme) => ({
          // Two narrow tiles per row leave no room beside the text.
          display: { xs: "none", md: "block" },
          position: "absolute",
          right: 6,
          top: "50%",
          // The battery lies with its terminal on the right, like a phone's.
          transform:
            view === "low-battery"
              ? "translateY(-50%) rotate(90deg)"
              : "translateY(-50%)",
          fontSize: problemIconSizePx,
          opacity: quietIconOpacity,
          [theme.breakpoints.up(largeProblemIconMinWidthPx)]: {
            right: 12,
            fontSize: largeProblemIconSizePx,
          },
        }),
        isAlerting &&
          ((theme) => ({
            color: "error.main",
            opacity: alertIconOpacity,
            ...theme.applyStyles("dark", { opacity: darkAlertIconOpacity }),
          })),
      ]}
    />
  );
}
