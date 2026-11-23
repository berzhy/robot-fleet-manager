import Battery20Icon from "@mui/icons-material/Battery20";
import Battery30Icon from "@mui/icons-material/Battery30";
import Battery50Icon from "@mui/icons-material/Battery50";
import Battery60Icon from "@mui/icons-material/Battery60";
import Battery80Icon from "@mui/icons-material/Battery80";
import Battery90Icon from "@mui/icons-material/Battery90";
import BatteryCharging20Icon from "@mui/icons-material/BatteryCharging20";
import BatteryCharging30Icon from "@mui/icons-material/BatteryCharging30";
import BatteryCharging50Icon from "@mui/icons-material/BatteryCharging50";
import BatteryCharging60Icon from "@mui/icons-material/BatteryCharging60";
import BatteryCharging80Icon from "@mui/icons-material/BatteryCharging80";
import BatteryCharging90Icon from "@mui/icons-material/BatteryCharging90";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import BatteryFullIcon from "@mui/icons-material/BatteryFull";
import BatteryUnknownIcon from "@mui/icons-material/BatteryUnknown";

// Lying down, the battery fills 10 of the icon's 24 units of height: at this
// size it is as tall as the digits beside it.
const iconSizePx = 34;

// Material's battery icons come in steps. Each level shows the step at or
// below it, and anything under 20% shows the lowest step.
const batteryLevels = [
  {
    minPercent: 100,
    icon: BatteryFullIcon,
    chargingIcon: BatteryChargingFullIcon,
  },
  { minPercent: 90, icon: Battery90Icon, chargingIcon: BatteryCharging90Icon },
  { minPercent: 80, icon: Battery80Icon, chargingIcon: BatteryCharging80Icon },
  { minPercent: 60, icon: Battery60Icon, chargingIcon: BatteryCharging60Icon },
  { minPercent: 50, icon: Battery50Icon, chargingIcon: BatteryCharging50Icon },
  { minPercent: 30, icon: Battery30Icon, chargingIcon: BatteryCharging30Icon },
  { minPercent: 0, icon: Battery20Icon, chargingIcon: BatteryCharging20Icon },
];

export default function BatteryIcon({
  percent,
  isCharging,
}: {
  percent: number | null;
  isCharging: boolean;
}) {
  const level =
    percent === null
      ? undefined
      : batteryLevels.find(({ minPercent }) => percent >= minPercent);
  const Icon = !level
    ? BatteryUnknownIcon
    : isCharging
      ? level.chargingIcon
      : level.icon;

  return (
    <Icon
      // Lying down as on a phone: the terminal on the right, filling from the left.
      // The empty space above and below it does not make the row taller.
      sx={{ fontSize: iconSizePx, transform: "rotate(90deg)", my: -0.5 }}
    />
  );
}
