"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import HomeIcon from "@mui/icons-material/Home";
import MenuIcon from "@mui/icons-material/Menu";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ReplayIcon from "@mui/icons-material/Replay";
import StopIcon from "@mui/icons-material/Stop";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { useId, useState } from "react";

import {
  actionLabels,
  actionUnavailable,
  robotActions,
  type RobotAction,
} from "@/modules/robots/robot-actions";
import type { Robot } from "@/modules/robots/robot";

export default function RobotTableRowMenu({
  robot,
  evaluatedAt,
  onAction,
  unverified = false,
  onDelete,
  disabled,
}: {
  disabled: boolean;
  robot: Robot;
  evaluatedAt: number;
  onAction: (robot: Robot, action: RobotAction) => void;
  unverified?: boolean;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const id = useId();

  return (
    <>
      <IconButton
        data-testid="robot-actions"
        disabled={disabled}
        aria-label={`Actions for ${robot.name}`}
        aria-haspopup="menu"
        aria-controls={anchor ? id : undefined}
        aria-expanded={anchor ? true : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MenuIcon />
      </IconButton>
      <Menu
        id={id}
        slotProps={{ list: { disabledItemsFocusable: true } }}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        {robotActions.map((action) => {
          const reason = unverified
            ? "Refresh robot connection before requesting an action"
            : actionUnavailable(robot, action, evaluatedAt);
          const Icon = {
            start: PlayArrowIcon,
            stop: StopIcon,
            "return-to-base": HomeIcon,
            retry: ReplayIcon,
          }[action];
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
                  onAction(robot, action);
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
