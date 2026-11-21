"use client";

// A client component: the brand artwork's sx follows the colour scheme
// through a function, which a server component cannot pass to MUI.
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Image from "next/image";

import illustration from "@/assets/work-in-progress.png";
import { brandArtworkSx } from "@/theme/brand-artwork";

export default function WorkInProgress({
  section,
  message,
}: {
  section: string;
  message: string;
}) {
  return (
    <Stack spacing={3} sx={{ flex: 1, minHeight: 0 }}>
      <Typography component="h1" variant="h4">
        {section}
      </Typography>
      <Stack
        spacing={2}
        sx={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          py: 3,
        }}
      >
        <Box
          component={Image}
          src={illustration}
          alt=""
          loading="eager"
          width={480}
          height={320}
          sx={[
            { width: 480, maxWidth: "100%", height: "auto" },
            ...brandArtworkSx,
          ]}
        />
        <Typography component="h2" variant="h6">
          Work in progress
        </Typography>
        <Typography color="textSecondary">{message}</Typography>
      </Stack>
    </Stack>
  );
}
