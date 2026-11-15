import { z } from "zod";

export const telemetryBatchSchema = z
  .strictObject({
    reports: z
      .array(
        z.strictObject({
          robotId: z.string().trim().min(1).max(100),
          activity: z.enum([
            "working",
            "idle",
            "charging",
            "blocked",
            "unknown",
          ]),
          batteryPercent: z.number().min(0).max(100),
          area: z.string().trim().min(1).max(100).nullable(),
          observedAt: z.iso
            .datetime({ offset: true })
            .transform((value) => new Date(value).toISOString()),
        }),
      )
      .min(1)
      .max(100),
  })
  .refine(
    ({ reports }) =>
      new Set(reports.map((report) => report.robotId)).size === reports.length,
  );
export type TelemetryReport = z.infer<
  typeof telemetryBatchSchema
>["reports"][number];
