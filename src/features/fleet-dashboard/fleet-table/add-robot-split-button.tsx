"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { type Ref, useId, useState } from "react";

export default function AddRobotSplitButton({
  buttonRef,
  loading,
  disabled,
  onAdd,
}: {
  buttonRef: Ref<HTMLButtonElement>;
  loading: boolean;
  disabled: boolean;
  onAdd: (trigger: HTMLButtonElement, count: 1 | 10 | 100) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const id = useId();
  return (
    <>
      <ButtonGroup variant="outlined" aria-label="Add robots">
        <Button
          ref={buttonRef}
          startIcon={<AddIcon />}
          loading={loading}
          disabled={disabled}
          onClick={(event) => onAdd(event.currentTarget, 1)}
        >
          Add robot
        </Button>
        <Button
          size="small"
          disabled={disabled || loading}
          aria-label="More add options"
          aria-haspopup="menu"
          aria-expanded={anchor ? true : undefined}
          aria-controls={anchor ? id : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>
      <Menu
        id={id}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        {([10, 100] as const).map((count) => (
          <MenuItem
            key={count}
            onClick={() => {
              if (anchor) onAdd(anchor, count);
              setAnchor(null);
            }}
          >
            Add {count} robots
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
