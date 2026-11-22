import DeleteIcon from "@mui/icons-material/Delete";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
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
  onAdd,
  onDeleteAll,
}: {
  buttonRef: Ref<HTMLButtonElement>;
  loading: boolean;
  onDeleteAll: (trigger: HTMLButtonElement) => void;
  onAdd: (count: 1 | 10 | 100) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const id = useId();
  const optionsButtonId = `${id}-button`;
  return (
    <>
      <ButtonGroup variant="contained" color="primary" aria-label="Add robots">
        <Button
          data-testid="fleet-add-robot"
          ref={buttonRef}
          startIcon={<AddIcon />}
          loading={loading}
          onClick={() => onAdd(1)}
        >
          Add robot
        </Button>
        <Button
          data-testid="fleet-add-options"
          size="small"
          disabled={loading}
          id={optionsButtonId}
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
        slotProps={{ list: { "aria-labelledby": optionsButtonId } }}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        {([10, 100] as const).map((count) => (
          <MenuItem
            key={count}
            data-testid={`fleet-add-robots-${count}`}
            onClick={() => {
              onAdd(count);
              setAnchor(null);
            }}
          >
            Add {count} robots
          </MenuItem>
        ))}
        <Divider component="li" />
        <MenuItem
          onClick={() => {
            if (anchor) {
              onDeleteAll(anchor);
            }
            setAnchor(null);
          }}
        >
          <ListItemIcon>
            <DeleteIcon color="error" />
          </ListItemIcon>
          <ListItemText
            primary="Delete all robots"
            slotProps={{ primary: { color: "error" } }}
          />
        </MenuItem>
      </Menu>
    </>
  );
}
