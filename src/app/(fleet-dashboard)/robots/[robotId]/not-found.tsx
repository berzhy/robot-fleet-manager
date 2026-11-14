"use client";

import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";

export default function RobotNotFound() {
  return (
    <Stack spacing={2}>
      <Typography component="h1" variant="h4">
        Robot not found
      </Typography>
      <Link component={NextLink} href="/">
        Back to fleet dashboard
      </Link>
    </Stack>
  );
}
