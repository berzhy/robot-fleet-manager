"use client";

import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";

import type { Robot } from "@/modules/robots/robot";
import { formatActivity, formatBattery } from "../utils/robot-formatters";

export default function RobotDetails({ robot }: { robot: Robot }) {
  const fields = {
    ID: robot.id,
    Manufacturer: robot.manufacturer,
    Site: robot.site,
    Area: robot.area ?? "Unknown",
    Activity: formatActivity(robot.activity),
    Battery: formatBattery(robot.batteryPercent),
  };
  return (
    <Stack spacing={3}>
      <Breadcrumbs aria-label="Breadcrumb">
        <Link component={NextLink} href="/">
          Fleet dashboard
        </Link>
        <Typography aria-current="page">{robot.name}</Typography>
      </Breadcrumbs>
      <Typography component="h1" variant="h4">
        {robot.name}
      </Typography>
      <Box component="dl" sx={{ m: 0 }}>
        {Object.entries(fields).map(([label, value]) => (
          <Box key={label} sx={{ mb: 2 }}>
            <Typography component="dt" variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography component="dd" sx={{ m: 0 }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
