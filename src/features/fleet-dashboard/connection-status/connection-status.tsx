import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FiberManualRecordOutlinedIcon from "@mui/icons-material/FiberManualRecordOutlined";
import Stack from "@mui/material/Stack";
import type { connectionStatus } from "@/modules/telemetry/freshness";

type Status = ReturnType<typeof connectionStatus> | "Checking";
const colors = {
  Online: "success.main",
  Delayed: "warning.dark",
  Offline: "text.secondary",
  Unknown: "text.secondary",
  Checking: "text.secondary",
} as const;

/** Decorative dot; visible connection text must accompany it somewhere in the view. */
export function ConnectionIndicator({ status }: { status: Status }) {
  const Icon =
    status === "Unknown" || status === "Checking"
      ? FiberManualRecordOutlinedIcon
      : FiberManualRecordIcon;
  return (
    <Icon
      fontSize="inherit"
      aria-hidden="true"
      sx={[
        { color: colors[status] },
        (theme) =>
          theme.applyStyles(
            "light",
            status === "Online"
              ? { color: (theme.vars ?? theme).palette.success.light }
              : {},
          ),
      ]}
    />
  );
}

export default function ConnectionStatus({
  status,
  unverified = false,
}: {
  status: Status;
  unverified?: boolean;
}) {
  return (
    <Stack
      component="span"
      direction="row"
      spacing={1}
      sx={{ alignItems: "center" }}
    >
      <ConnectionIndicator status={status} />
      <span>
        {status}
        {unverified ? " (unverified)" : ""}
      </span>
    </Stack>
  );
}
