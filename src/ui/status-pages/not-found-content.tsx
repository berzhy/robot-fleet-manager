"use client";

// The illustration's sx is a function, which a server component cannot pass
// to MUI.
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import NextLink from "next/link";

import illustration from "@/ui/assets/not-found.webp";
import { illustrationSx } from "@/ui/theme/illustration";

const illustrationWidthPx = 384;
const illustrationHeightPx = 256;

export default function NotFoundContent({
  title,
  robotsHref,
}: {
  title: string;
  robotsHref: string;
}) {
  return (
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
        width={illustrationWidthPx}
        height={illustrationHeightPx}
        sx={[
          { width: illustrationWidthPx, maxWidth: "100%", height: "auto" },
          illustrationSx,
        ]}
      />
      <Typography component="h1" variant="h4">
        {title}
      </Typography>
      <Link component={NextLink} href={robotsHref}>
        Back to robots
      </Link>
    </Stack>
  );
}
