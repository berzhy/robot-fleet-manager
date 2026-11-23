import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useId, useState } from "react";

import type { Robot, RobotAction } from "@/common/types";

import {
  actionIcons,
  actionLabels,
  mainActivityAction,
} from "../../robot-action-display";
import useRobotAction from "../../use-robot-action";

export default function RobotTableRowMenu({
  robot,
  onDelete,
}: {
  robot: Robot;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
  const { requestAction, unavailableReason } = useRobotAction(robot);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const id = useId();
  const buttonId = `${id}-button`;
  const actions: RobotAction[] = [mainActivityAction(robot), "return-to-base"];

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
        {actions.map((action, position) => {
          const reason = unavailableReason(action);
          const Icon = actionIcons[action];
          return (
            <MenuItem
              // By position: one element for Start, Stop and Retry, so focus
              // survives a live update swapping them.
              key={position}
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
