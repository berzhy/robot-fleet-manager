import { z } from "zod";

import {
  integrationTypes,
  robotActions,
  robotPageSizes,
  robotTypes,
} from "./robot";
import { fleetViews } from "./robot-filters";

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

export const robotFiltersSchema = z.object({
  search: z.string().trim().min(2).max(100).optional(),
  site: z.string().min(1).max(100).optional(),
  manufacturer: z.string().min(1).max(100).optional(),
  integrationType: z.enum(integrationTypes).optional(),
  type: z.enum(robotTypes).optional(),
  view: z.enum(fleetViews).default("all"),
});
export type RobotFilters = z.infer<typeof robotFiltersSchema>;

export const createRobotBatchSchema = z.strictObject({
  robots: z.array(createRobotSchema).min(1).max(100),
});

export const robotActionRequestSchema = z.strictObject({
  action: z.enum(robotActions),
});
