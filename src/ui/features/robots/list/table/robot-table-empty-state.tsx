import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Image from "next/image";

import fleetEmpty from "@/ui/assets/fleet-empty.png";
import { illustrationSx } from "@/ui/theme/illustration";

export default function RobotTableEmptyState({
  onAdd,
  adding,
}: {
  onAdd: () => void;
  adding: boolean;
}) {
  return (
    <Stack
      spacing={2}
      sx={{
        alignItems: "center",
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
          },
          illustrationSx,
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
        onClick={onAdd}
      >
        Add robot
      </Button>
    </Stack>
  );
}
