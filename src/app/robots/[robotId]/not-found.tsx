"use client";

import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";

export default function RobotNotFound() {
  return (
    <Stack spacing={2}>
      <Typography data-testid="robot-not-found" component="h1" variant="h4">
        Robot not found
      </Typography>
      <Link
        data-testid="robot-not-found-back"
        component={NextLink}
        href="/robots"
      >
        Back to fleet dashboard
      </Link>
    </Stack>
  );
}
