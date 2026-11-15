import { setTimeout as delay } from "node:timers/promises";
import type { Robot } from "@/modules/robots/robot";
import {
  advanceRobot,
  applyControl,
  initializeRobot,
  type SimulatedRobot,
} from "./simulation";

export async function runSimulator(origin: string, signal: AbortSignal) {
  const states = new Map<string, SimulatedRobot>();
  let previous = Date.now();
  let failing = false;
  async function request(path: string, init?: RequestInit) {
    const response = await fetch(new URL(path, origin), {
      ...init,
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`Simulator request failed (${response.status})`);
    return response;
  }
  while (!signal.aborted) {
    let failed = false;
    const discovered = new Set<string>();
    try {
      const response = await request("/api/robots/registry");
      const { items } = (await response.json()) as { items: Robot[] };
      const ids = new Set(items.map((robot) => robot.id));
      for (const id of states.keys()) if (!ids.has(id)) states.delete(id);
      for (const robot of items) {
        if (!states.has(robot.id)) {
          states.set(robot.id, initializeRobot(robot));
          discovered.add(robot.id);
        }
        applyControl(states.get(robot.id)!, robot);
      }
    } catch {
      failed = true;
    }
    const now = Date.now();
    const seconds = Math.max(0, (now - previous) / 1000);
    previous = now;
    const reports = Array.from(states, ([id, state]) =>
      advanceRobot(id, state, discovered.has(id) ? 0 : seconds, now),
    );
    for (
      let start = 0;
      start < reports.length && !signal.aborted;
      start += 100
    ) {
      try {
        await request("/api/telemetry/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reports: reports.slice(start, start + 100) }),
        });
      } catch {
        failed = true;
      }
    }
    if (signal.aborted) break;
    if (failed && !failing)
      console.error("Simulator requests failed; retrying.");
    if (!failed && failing) console.info("Simulator connection restored.");
    failing = failed;
    try {
      await delay(1000, undefined, { signal });
    } catch {
      break;
    }
  }
}
