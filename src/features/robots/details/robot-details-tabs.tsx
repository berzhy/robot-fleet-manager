import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useId, useState, type ReactNode } from "react";

import type { Robot, SiteRobot } from "@/modules/robots/robot";

import LocationMap from "./location-map";
import RobotLogs from "./robot-logs";

type DetailsTab = "location" | "logs";

/** The robot's location and logs, one at a time, in a card with its tabs. */
export default function RobotDetailsTabs({
  robot,
  peers,
  evaluatedAt,
  unverified,
}: {
  robot: Robot;
  peers: SiteRobot[];
  evaluatedAt: number;
  unverified: boolean;
}) {
  const baseId = useId();
  const [tab, setTab] = useState<DetailsTab>("location");

  return (
    <Paper variant="outlined" sx={{ px: 3, pb: 3 }}>
      {/* The selected tab's indicator sits on this line. */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tab}
          onChange={(_event, value: DetailsTab) => setTab(value)}
          aria-label="Robot details"
        >
          <Tab
            label="Location"
            value="location"
            id={tabId(baseId, "location")}
            aria-controls={panelId(baseId, "location")}
          />
          <Tab
            label="Logs"
            value="logs"
            id={tabId(baseId, "logs")}
            aria-controls={panelId(baseId, "logs")}
          />
        </Tabs>
      </Box>
      <TabPanel baseId={baseId} value="location" selected={tab}>
        <LocationMap
          robot={robot}
          peers={peers}
          evaluatedAt={evaluatedAt}
          unverified={unverified}
        />
      </TabPanel>
      <TabPanel baseId={baseId} value="logs" selected={tab}>
        <RobotLogs robot={robot} />
      </TabPanel>
    </Paper>
  );
}

function TabPanel({
  baseId,
  value,
  selected,
  children,
}: {
  baseId: string;
  value: DetailsTab;
  selected: DetailsTab;
  children: ReactNode;
}) {
  return (
    <Box
      role="tabpanel"
      id={panelId(baseId, value)}
      aria-labelledby={tabId(baseId, value)}
      hidden={value !== selected}
      tabIndex={0}
      sx={{ pt: 3 }}
    >
      {children}
    </Box>
  );
}

function tabId(baseId: string, value: DetailsTab) {
  return `${baseId}-${value}-tab`;
}

function panelId(baseId: string, value: DetailsTab) {
  return `${baseId}-${value}-panel`;
}
