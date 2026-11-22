import { z } from "zod";

import { robotPageSizes, robotTypes, integrationTypes } from "./robot";
import { robotActions } from "./robot-actions";

const label = z.string().trim().min(1).max(100);
export const createRobotSchema = z.strictObject({
  name: label,
  manufacturer: label,
  type: z.enum(robotTypes),
  integrationType: z.enum(integrationTypes),
  site: label,
});
export type CreateRobotInput = z.infer<typeof createRobotSchema>;

export const robotPageSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)$/)
  .transform(Number)
  .pipe(
    z
      .number()
      .int()
      .min(0)
      .max(Math.floor(Number.MAX_SAFE_INTEGER / Math.max(...robotPageSizes))),
  );

export const robotPageSizeSchema = z
  .enum(robotPageSizes.map(String))
  .transform(Number);

export const createRobotBatchSchema = z.strictObject({
  robots: z.array(createRobotSchema).min(1).max(100),
});

export const robotActionRequestSchema = z.strictObject({
  action: z.enum(robotActions),
});
