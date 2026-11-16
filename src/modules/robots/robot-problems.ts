export const robotProblemCodes = [
  "path-blocked",
  "position-lost",
  "sensor-obstructed",
] as const;

export type RobotProblemCode = (typeof robotProblemCodes)[number];

export const robotProblemDetails: Record<
  RobotProblemCode,
  { label: string; guidance: string }
> = {
  "path-blocked": {
    label: "Path blocked",
    guidance: "Clear the obstruction before retrying activity.",
  },
  "position-lost": {
    label: "Position lost",
    guidance: "Check the robot’s position before retrying activity.",
  },
  "sensor-obstructed": {
    label: "Sensor obstructed",
    guidance: "Clear the sensor obstruction before retrying activity.",
  },
};
