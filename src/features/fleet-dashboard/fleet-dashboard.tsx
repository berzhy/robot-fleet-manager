"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import FleetDemoControls from "./fleet-demo-controls";
import FleetTable from "./fleet-table/fleet-table";
import useRobots from "./hooks/use-robots";
import type { DemoScenario } from "./types/robot";

export default function FleetDashboard() {
  const { state, scenario, setScenario, reload } = useRobots();
  const [page, setPage] = useState(0);
  function changeScenario(nextScenario: DemoScenario) {
    setPage(0);
    setScenario(nextScenario);
  }
  function reloadRobots() {
    setPage(0);
    reload();
  }
  return (
    <Stack spacing={3} sx={{ flex: 1, minHeight: 0 }}>
      <Typography component="h1" variant="h4" sx={{ flexShrink: 0 }}>
        Fleet dashboard
      </Typography>
      <Box
        role="status"
        aria-label="Fleet loading status"
        aria-atomic="true"
        sx={{
          position: "absolute",
          width: "1px",
          height: "1px",
          p: 0,
          m: -1,
          overflow: "hidden",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
      >
        {state.status === "loading" ? "Loading robots" : ""}
      </Box>
      <FleetDemoControls
        scenario={scenario}
        loading={state.status === "loading"}
        onScenarioChange={changeScenario}
        onReload={reloadRobots}
      />
      <FleetTable
        state={state}
        page={page}
        onPageChange={setPage}
        onRetry={reloadRobots}
      />
    </Stack>
  );
}
