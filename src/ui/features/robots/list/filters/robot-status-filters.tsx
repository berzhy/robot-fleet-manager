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
import {
  criticalBatteryPercent,
  fleetViews,
  lowBatteryPercent,
  offlineAfterMs,
} from "@/common/constants";
import type { RobotFilters } from "@/common/schemas";
import type { RobotPage } from "@/common/types";

import { setRobotListFilters } from "../robot-list-url-params";

import { fleetViewId, fleetViewLabels } from "./filter-fields";

type ProblemView = Exclude<RobotFilters["view"], "all">;

const explanations = {
  all: "All robots matching the search and the selected location, manufacturer, type and integration.",
  "needs-attention": `Offline, a reported problem, or critical battery at or below ${criticalBatteryPercent}% while not charging.`,
  offline: `Last report received more than ${offlineAfterMs / 1000} seconds ago. Robots with no reports are Unknown.`,
  "low-battery": `Last-reported battery at or below ${lowBatteryPercent}%, including Returning but excluding Charging.`,
};

// Lifted off the table card by a soft shadow, so the tiles read as things to
// press. Dark mode shows elevation as a lighter fill instead, the same as the
// card's, so there an outline gives the tiles their edge.
const tileElevation = 2;

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

export default function RobotStatusFilters({
  view: selectedView,
  summary,
  isLoading,
  loadFailed,
}: {
  view: RobotFilters["view"];
  summary: RobotPage["summary"] | undefined;
  isLoading: boolean;
  loadFailed: boolean;
}) {
  return (
    <Box
      role="group"
      aria-label="Robot status filters"
      aria-busy={isLoading}
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
        gap: 2,
        flexShrink: 0,
      }}
    >
      {fleetViews.map((view) => {
        const selected = selectedView === view;
        return (
          <Card
            key={view}
            elevation={tileElevation}
            sx={(theme) =>
              theme.applyStyles("dark", {
                border: `1px solid ${theme.vars.palette.divider}`,
              })
            }
          >
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
                id={fleetViewId(view)}
                aria-pressed={selected}
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
                  // MUI's selected tint for lists and menus: a neutral grey
                  // fill reads as a pressed or disabled tile.
                  selected &&
                    ((theme) => ({
                      bgcolor: theme.alpha(
                        theme.vars.palette.primary.main,
                        theme.vars.palette.action.selectedOpacity,
                      ),
                    })),
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
                  // Inside a <button>, which allows only phrasing content.
                  component="span"
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
                    ) : loadFailed ? (
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
          // Narrower tiles leave no room beside the text.
          display: { xs: "none", lg: "block" },
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
