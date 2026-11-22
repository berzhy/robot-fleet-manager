"use client";

import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

// Keeps the app shell and offers a retry when a page fails to render, instead
// of Next's bare default error screen.
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <Stack
      spacing={2}
      sx={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <ErrorOutlinedIcon color="error" fontSize="large" />
      <Typography component="h1" variant="h5">
        Something went wrong
      </Typography>
      <Typography color="textSecondary">
        This page could not be loaded. Please try again.
      </Typography>
      <Button variant="contained" onClick={retry}>
        Try again
      </Button>
    </Stack>
  );
}
