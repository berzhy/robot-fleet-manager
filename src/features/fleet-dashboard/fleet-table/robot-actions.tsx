"use client";

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import HomeIcon from "@mui/icons-material/Home";
import ReplayIcon from "@mui/icons-material/Replay";
import Tooltip from "@mui/material/Tooltip";
import {
  actionLabels,
  actionUnavailable,
  robotActions,
  type RobotAction,
} from "@/modules/robots/robot-actions";
import DeleteIcon from "@mui/icons-material/Delete";
import MenuIcon from "@mui/icons-material/Menu";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";

import type { Robot } from "@/modules/robots/robot";

export default function RobotActions({
  onOpenChange,
  robot,
  onAction,
  unverified = false,
  onDelete,
  disabled,
}: {
  onOpenChange?: (open: boolean) => void;
  disabled: boolean;
  robot: Robot;
  onAction?: (robot: Robot, action: RobotAction) => void;
  unverified?: boolean;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const notifiedOpen = useRef(false);
  const notify = useEffectEvent((open: boolean) => onOpenChange?.(open));
  useEffect(
    () => () => {
      if (notifiedOpen.current) notify(false);
    },
    [],
  );

  function reportOpen(open: boolean) {
    notifiedOpen.current = open;
    onOpenChange?.(open);
  }

  const id = useId();
  const [openedAt, setOpenedAt] = useState(0);

  return (
    <>
      <IconButton
        data-testid="robot-actions"
        disabled={disabled}
        aria-label={`Actions for ${robot.name}`}
        aria-haspopup="menu"
        aria-controls={anchor ? id : undefined}
        aria-expanded={anchor ? true : undefined}
        onClick={(event) => {
          setOpenedAt(Date.now());
          setAnchor(event.currentTarget);
          reportOpen(true);
        }}
      >
        <MenuIcon />
      </IconButton>
      <Menu
        id={id}
        slotProps={{ list: { disabledItemsFocusable: true } }}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => {
          setAnchor(null);
          reportOpen(false);
        }}
      >
        {robotActions.map((action) => {
          const reason = unverified
            ? "Refresh robot connection before requesting an action"
            : actionUnavailable(robot, action, openedAt);
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
                  if (reason || !onAction) return;
                  onAction(robot, action);
                  setAnchor(null);
                  reportOpen(false);
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
            if (anchor) onDelete(robot, anchor);
            setAnchor(null);
            reportOpen(false);
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
