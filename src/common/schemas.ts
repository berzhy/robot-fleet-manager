import { z } from "zod";

import {
  fleetViews,
  integrationTypes,
  maxReportsPerBatch,
  robotActions,
  robotActivities,
  robotPageSize,
  robotPageSizes,
  robotProblemCodes,
  robotTypes,
} from "./constants";

// What the API accepts: from the browser, then from the robots.

const label = z.string().trim().min(1).max(100);
export const createRobotSchema = z.strictObject({
  name: label,
  manufacturer: label,
  type: z.enum(robotTypes),
  integrationType: z.enum(integrationTypes),
  site: label,
});
export type CreateRobotInput = z.infer<typeof createRobotSchema>;

const robotPageSchema = z
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

const robotPageSizeSchema = z
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

export const robotListParamsSchema = z.object({
  ...robotFiltersSchema.shape,
  pageSize: robotPageSizeSchema.default(robotPageSize),
  page: robotPageSchema.default(0),
});
export type RobotListParams = z.infer<typeof robotListParamsSchema>;
export const defaultRobotListParams = robotListParamsSchema.parse({});

export const createRobotBatchSchema = z.strictObject({
  robots: z.array(createRobotSchema).min(1).max(100),
});

export const robotActionRequestSchema = z.strictObject({
  action: z.enum(robotActions),
});

export const telemetryBatchSchema = z
  .strictObject({
    reports: z
      .array(
        z
          .strictObject({
            robotId: z.string().trim().min(1).max(100),
            activity: z.enum(robotActivities),
            problemCode: z.enum(robotProblemCodes).nullable().default(null),
            appliedControlRevision: z.number().int().nonnegative(),
            batteryPercent: z.number().min(0).max(100),
            area: z.string().trim().min(1).max(100).nullable(),
            observedAt: z.iso
              .datetime({ offset: true })
              .transform((value) => new Date(value).toISOString()),
          })
          .refine(
            (report) =>
              (report.activity === "needs-attention") ===
              (report.problemCode !== null),
          ),
      )
      .min(1)
      .max(maxReportsPerBatch),
  })
  .refine(
    ({ reports }) =>
      new Set(reports.map((report) => report.robotId)).size === reports.length,
  );
export type TelemetryReport = z.infer<
  typeof telemetryBatchSchema
>["reports"][number];

export const apiErrorBodySchema = z.object({
  error: z.object({ message: z.string() }),
});
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
