import { z } from "zod";
import { robotProblemCodes } from "../robots/robot-problems";
import { robotActivities } from "../robots/robot";

export const maxReportsPerBatch = 100;

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
