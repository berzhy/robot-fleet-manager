"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import MenuIcon from "@mui/icons-material/Menu";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useId, useState } from "react";

import type { Robot } from "@/modules/robots/robot";

export default function RobotActions({
  onOpenChange,
  robot,
  onDelete,
  disabled,
}: {
  onOpenChange?: (open: boolean) => void;
  disabled: boolean;
  robot: Robot;
  onDelete: (robot: Robot, trigger: HTMLButtonElement) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const id = useId();
  return (
    <>
      <IconButton
        disabled={disabled}
        aria-label={`Actions for ${robot.name}`}
        aria-haspopup="menu"
        aria-controls={anchor ? id : undefined}
        aria-expanded={anchor ? true : undefined}
        onClick={(event) => {
          setAnchor(event.currentTarget);
          onOpenChange?.(true);
        }}
      >
        <MenuIcon />
      </IconButton>
      <Menu
        id={id}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => {
          setAnchor(null);
          onOpenChange?.(false);
        }}
      >
        <MenuItem
          onClick={() => {
            if (anchor) onDelete(robot, anchor);
            setAnchor(null);
            onOpenChange?.(false);
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
