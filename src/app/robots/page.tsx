import Typography from "@mui/material/Typography";
import { Suspense } from "react";

import RobotList from "@/features/robots/list/robot-list";

export default function RobotsPage() {
  return (
    // RobotList reads the URL with useSearchParams, which needs a boundary to prerender.
    <Suspense fallback={<Typography role="status">Loading robots</Typography>}>
      <RobotList />
    </Suspense>
  );
}
