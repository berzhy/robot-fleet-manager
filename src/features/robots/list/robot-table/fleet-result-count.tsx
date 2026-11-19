import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";

export default function FleetResultCount({
  resultCount,
}: {
  resultCount?: string;
}) {
  return (
    <Typography
      data-testid="fleet-result-count"
      variant="body2"
      color="text.secondary"
      sx={{ ml: "auto", pr: 2, fontVariantNumeric: "tabular-nums" }}
    >
      {resultCount ?? <Skeleton width={180} aria-hidden="true" />}
    </Typography>
  );
}
