import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function RobotTableErrorState({
  onRetry,
}: {
  onRetry: () => void;
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
