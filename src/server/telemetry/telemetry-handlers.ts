import "server-only";
import { telemetryBatchSchema } from "@/modules/telemetry/telemetry";
import type { FleetDatabase } from "../db/database";
import { errorResponse, jsonResponse } from "../http/responses";
import { ingestTelemetry } from "./telemetry";

const maxClockSkewMs = 5_000;

export function telemetryHandlers(database: () => FleetDatabase) {
  return {
    async ingest(request: Request) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return invalid();
      }

      const parsed = telemetryBatchSchema.safeParse(body);
      const now = Date.now();
      if (
        !parsed.success ||
        parsed.data.reports.some(
          (report) => Date.parse(report.observedAt) > now + maxClockSkewMs,
        )
      ) {
        return invalid();
      }

      try {
        // Senders learn which reports changed nothing, instead of a silent drop.
        return jsonResponse(
          ingestTelemetry(
            database(),
            parsed.data.reports,
            new Date(now).toISOString(),
          ),
        );
      } catch (reason) {
        console.error("Telemetry API failed", reason);
        return errorResponse(
          500,
          "INTERNAL_ERROR",
          "Unable to ingest telemetry.",
        );
      }
    },
  };
}

function invalid() {
  return errorResponse(
    400,
    "INVALID_INPUT",
    `Provide 1–100 valid telemetry reports with unique robot IDs and timestamps no more than ${maxClockSkewMs / 1000} seconds ahead.`,
  );
}
