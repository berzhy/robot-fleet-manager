"use client";
import AddIcon from "@mui/icons-material/Add";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Image from "next/image";

import fleetEmpty from "@/assets/fleet-empty.png";

export function FleetTableEmptyState({
  onAdd,
  adding,
}: {
  onAdd: (trigger: HTMLButtonElement) => void;
  adding: boolean;
}) {
  return (
    <Stack
      spacing={2}
      sx={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        p: 3,
      }}
    >
      <Box
        component={Image}
        src={fleetEmpty}
        alt=""
        width={240}
        height={240}
        sx={[
          {
            display: "block",
            flexShrink: 0,
            maxWidth: "100%",
            height: "auto",
            objectFit: "contain",
            filter: "brightness(0.8)",
          },
          (theme) => theme.applyStyles("dark", { filter: "brightness(1.6)" }),
        ]}
      />
      <Typography data-testid="fleet-empty" role="status">
        No robots available.
      </Typography>
      <Button
        data-testid="fleet-empty-add-robot"
        variant="text"
        startIcon={<AddIcon />}
        loading={adding}
        onClick={(event) => onAdd(event.currentTarget)}
      >
        Add robot
      </Button>
    </Stack>
  );
}
export function FleetTableErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Stack
      spacing={2}
      sx={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        p: 3,
      }}
    >
      <ErrorOutlinedIcon color="error" fontSize="large" />
      <Typography data-testid="fleet-load-error" role="alert" color="error">
        Unable to load robots. Please try again.
      </Typography>
      <Button data-testid="fleet-retry" variant="text" onClick={onRetry}>
        Retry
      </Button>
    </Stack>
  );
}
