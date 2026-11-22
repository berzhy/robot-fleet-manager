import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useId, useState } from "react";

import {
  actionLabels,
  commandUnavailable,
  robotActions,
} from "@/modules/robots/robot-actions";
import type { Robot } from "@/modules/robots/robot";
import type { RobotReading } from "@/modules/robots/robot-reading";

import { useRobotWriteLock } from "../../api/robot-mutations";
import { actionIcons } from "../../robot-action-icons";
import useRobotCommand, {
  otherChangePendingReason,
} from "../../use-robot-command";

export default function RobotTableRowMenu({
  reading,
  onDelete,
}: {
  reading: RobotReading;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
  const { robot } = reading;
  const requestAction = useRobotCommand();
  const { isWritePending } = useRobotWriteLock();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const id = useId();
  const buttonId = `${id}-button`;

  return (
    <>
      <IconButton
        data-testid="robot-actions"
        size="small"
        // Stays enabled during a write: closing the menu returns focus here,
        // and a disabled button would drop it. The items say why they wait.
        id={buttonId}
        aria-label={`Actions for ${robot.name}`}
        aria-haspopup="menu"
        aria-controls={anchor ? id : undefined}
        aria-expanded={anchor ? true : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        id={id}
        slotProps={{
          list: { disabledItemsFocusable: true, "aria-labelledby": buttonId },
        }}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        {robotActions.map((action) => {
          const reason = isWritePending
            ? otherChangePendingReason
            : commandUnavailable(reading, action);
          const Icon = actionIcons[action];
          return (
            <MenuItem
              key={action}
              disabled={Boolean(reason)}
              onClick={() => {
                if (reason) {
                  return;
                }
                requestAction(robot, action);
                setAnchor(null);
              }}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              {/* The reason shows as text: MUI turns off pointer events on
                  disabled items, so a tooltip would never show on hover. */}
              <ListItemText primary={actionLabels[action]} secondary={reason} />
            </MenuItem>
          );
        })}
        <MenuItem
          data-testid="robot-delete"
          disabled={isWritePending}
          onClick={() => {
            if (anchor && !isWritePending) {
              onDelete(robot, anchor);
            }
            setAnchor(null);
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Delete"
            secondary={isWritePending ? otherChangePendingReason : undefined}
          />
        </MenuItem>
      </Menu>
    </>
  );
}
