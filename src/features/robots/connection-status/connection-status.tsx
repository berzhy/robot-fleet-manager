import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FiberManualRecordOutlinedIcon from "@mui/icons-material/FiberManualRecordOutlined";
import Stack from "@mui/material/Stack";
import { formatConnection } from "@/common/robots/robot-labels";
import type { ConnectionStatus } from "@/common/telemetry/freshness";

const colors = {
  online: "success.main",
  delayed: "warning.main",
  offline: "text.secondary",
  unknown: "text.secondary",
} satisfies Record<ConnectionStatus, string>;

/** Decorative dot; visible connection text must accompany it somewhere in the view. */
export function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const Icon =
    status === "unknown"
      ? FiberManualRecordOutlinedIcon
      : FiberManualRecordIcon;
  return (
    <Icon
      fontSize="inherit"
      aria-hidden="true"
      sx={{ color: colors[status] }}
    />
  );
}

export default function ConnectionStatus({
  status,
  unverified = false,
}: {
  status: ConnectionStatus;
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
        {formatConnection(status)}
        {unverified ? " (unverified)" : ""}
      </span>
    </Stack>
  );
}
