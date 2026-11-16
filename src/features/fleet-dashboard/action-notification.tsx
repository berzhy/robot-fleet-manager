import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";

export default function ActionNotification({
  severity,
  message,
  onClose,
}: {
  severity: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  return (
    <Snackbar
      key={message}
      open
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      autoHideDuration={severity === "success" ? 6000 : null}
      onClose={(_event, reason) => {
        if (reason !== "clickaway") onClose();
      }}
    >
      <Alert
        data-testid="fleet-notification"
        severity={severity}
        role={severity === "success" ? "status" : "alert"}
        slotProps={{
          closeButton: () => ({ "data-testid": "fleet-notification-close" }),
        }}
        onClose={onClose}
      >
        <Typography component="span" variant="body1">
          {message}
        </Typography>
      </Alert>
    </Snackbar>
  );
}
