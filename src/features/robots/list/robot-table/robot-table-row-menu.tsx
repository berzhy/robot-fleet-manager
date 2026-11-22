import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useId, useState } from "react";

import { robotActions, type Robot } from "@/common/robot";

import { actionIcons, actionLabels } from "../../robot-action-display";
import { commandUnavailable } from "../../robot-commands";
import type { RobotReading } from "../../robot-reading";
import useRobotCommand from "../../use-robot-command";

export default function RobotTableRowMenu({
  reading,
  onDelete,
}: {
  reading: RobotReading;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
  const { robot } = reading;
  const { requestAction, waitReason } = useRobotCommand(robot);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const id = useId();
  const buttonId = `${id}-button`;

  return (
    <>
      <IconButton
        data-testid="robot-actions"
        size="small"
        // Stays enabled while a command is sent: closing the menu returns
        // focus here, and a disabled button would drop it.
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
          const reason = waitReason ?? commandUnavailable(robot, action);
          const Icon = actionIcons[action];
          return (
            <MenuItem
              key={action}
              disabled={Boolean(reason)}
              onClick={() => {
                if (reason) {
                  return;
                }
                requestAction(action);
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
          onClick={() => {
            if (anchor) {
              onDelete(robot, anchor);
            }
            setAnchor(null);
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Delete" />
        </MenuItem>
      </Menu>
    </>
  );
}
