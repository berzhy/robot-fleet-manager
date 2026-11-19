import Image from "next/image";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import cleaning from "@/assets/robots/cleaning.webp";
import delivery from "@/assets/robots/delivery.webp";
import security from "@/assets/robots/security.webp";
import inspection from "@/assets/robots/inspection.webp";
import type { Robot } from "@/modules/robots/robot";
import {
  formatRobotType,
  formatIntegrationType,
  formatRobotTimestamp,
} from "../utils/robot-formatters";
const illustrations = { cleaning, delivery, security, inspection };
export default function RobotProfile({ robot }: { robot: Robot }) {
  const fields = [
    ["Manufacturer", robot.manufacturer],
    ["Type", formatRobotType(robot.type)],
    ["Integration", formatIntegrationType(robot.integrationType)],
    ["ID", robot.id],
    ["Registered", formatRobotTimestamp(robot.createdAt)],
  ];
  return (
    <Paper
      component="section"
      aria-label="Robot information"
      variant="outlined"
      sx={{ p: 3 }}
    >
      <Typography component="h2" variant="h6">
        Robot information
      </Typography>
      <Box sx={{ maxWidth: 280, mx: "auto" }}>
        <Image
          src={illustrations[robot.type]}
          alt=""
          loading="eager"
          width={640}
          height={640}
          sizes="(max-width: 600px) 75vw, 280px"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </Box>
      <Box component="dl" sx={{ m: 0, mt: 2, display: "grid", gap: 2 }}>
        {fields.map(([label, value]) => (
          <Box key={label}>
            <Typography component="dt" variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography
              component="dd"
              variant="subtitle2"
              sx={{ m: 0, overflowWrap: "anywhere" }}
            >
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
