"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { useId, useState } from "react";

import { actionLabels, robotActions } from "@/modules/robots/robot-actions";
import type { Robot } from "@/modules/robots/robot";

import { useRobotWriteLock } from "../../api/robot-mutations";
import { actionIcons } from "../../robot-action-icons";
import useRobotCommand, { commandUnavailable } from "../../use-robot-command";

export default function RobotTableRowMenu({
  robot,
  evaluatedAt,
  unverified = false,
  onDelete,
}: {
  robot: Robot;
  evaluatedAt: number;
  unverified?: boolean;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
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
        disabled={isWritePending}
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
          const reason = commandUnavailable(
            robot,
            action,
            evaluatedAt,
            unverified,
          );
          const Icon = actionIcons[action];
          return (
            <Tooltip
              key={action}
              title={reason ?? ""}
              placement="left"
              describeChild
            >
              <MenuItem
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
                <ListItemText>{actionLabels[action]}</ListItemText>
              </MenuItem>
            </Tooltip>
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
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
