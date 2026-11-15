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

export default function ConnectionStatus({
  status,
  unverified = false,
}: {
  status: Status;
  unverified?: boolean;
}) {
  const Icon =
    status === "Unknown" || status === "Checking"
      ? FiberManualRecordOutlinedIcon
      : FiberManualRecordIcon;
  return (
    <Stack
      component="span"
      direction="row"
      spacing={1}
      sx={{ alignItems: "center" }}
    >
      <Icon
        fontSize="inherit"
        aria-hidden="true"
        sx={{ color: colors[status] }}
      />
      <span>
        {status}
        {unverified ? " (unverified)" : ""}
      </span>
    </Stack>
  );
}
