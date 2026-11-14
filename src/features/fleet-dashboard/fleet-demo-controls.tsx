"use client";

import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";

import type { DemoScenario } from "./types/robot";

export default function FleetDemoControls({
  scenario,
  loading,
  onScenarioChange,
  onReload,
}: {
  scenario: DemoScenario;
  loading: boolean;
  onScenarioChange: (scenario: DemoScenario) => void;
  onReload: () => void;
}) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: "center", flexShrink: 0 }}
    >
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="demo-state-label">Demo state</InputLabel>
        <Select<DemoScenario>
          labelId="demo-state-label"
          id="demo-state"
          label="Demo state"
          value={scenario}
          onChange={(event) => onScenarioChange(event.target.value)}
        >
          <MenuItem value="success">Success</MenuItem>
          <MenuItem value="empty">Empty</MenuItem>
          <MenuItem value="error">Error</MenuItem>
        </Select>
      </FormControl>
      <Button onClick={onReload} disabled={loading}>
        Reload
      </Button>
    </Stack>
  );
}
