import { robotProblemCodes } from "@/modules/robots/robot-problems";
import type { ControlTarget, RegistryRobot } from "@/modules/robots/robot";
import type { TelemetryReport } from "@/modules/telemetry/telemetry";

export type SimulatedRobot = {
  battery: number;
  problemCode: RegistryRobot["problemCode"];
  activity: RegistryRobot["activity"];
  area: string;
  target: ControlTarget;
  appliedRevision: number;
  remaining: number;
  workingSeconds: number;
  faultAfter: number;
  faultCount: number;
  hash: number;
  connectionHash: number;
};

const departureDelay = 7;
const returnDuration = 10;
const returnToBaseBattery = 10;
const chargedBattery = 90;
const dischargeRate = 0.1;
const chargeRate = 0.5;
const minFaultInterval = 120;
const maxFaultInterval = 600;
const areas = ["Lobby", "Floor 1", "Warehouse"];

function hashId(id: string) {
  return Array.from(id).reduce(
    (value, char) => (Math.imul(value, 31) + char.charCodeAt(0)) >>> 0,
    0,
  );
}

function faultInterval(hash: number, count: number) {
  return (
    minFaultInterval +
    (hashId(`${hash}:${count}`) % (maxFaultInterval - minFaultInterval + 1))
  );
}

function faultProne(state: SimulatedRobot) {
  return state.hash % 5 === 0;
}

function offlineProne(state: SimulatedRobot) {
  return state.connectionHash % 5 === 0;
}

export function initializeRobot(robot: RegistryRobot): SimulatedRobot {
  const hash = hashId(robot.id);
  // Seeded robots start above the low-battery tier: deterministic 22–100%.
  return {
    problemCode: robot.problemCode,
    battery: robot.batteryPercent ?? 22 + (hash % 79),
    activity: robot.activity === "unknown" ? "idle" : robot.activity,
    area: robot.area ?? "Base",
    target: robot.controlTarget,
    appliedRevision: robot.appliedControlRevision,
    remaining: robot.activity === "returning" ? returnDuration : departureDelay,
    workingSeconds: 0,
    faultAfter: faultInterval(hash, 0),
    faultCount: 0,
    hash,
    connectionHash: hashId(`${robot.id}:connection`),
  };
}

export function applyControl(state: SimulatedRobot, robot: RegistryRobot) {
  if (robot.controlRevision <= state.appliedRevision) {
    return;
  }

  state.appliedRevision = robot.controlRevision;
  state.target = robot.controlTarget;
  state.problemCode = null;

  if (state.target === "stop") {
    state.activity = "idle";
  } else if (state.target === "base") {
    state.activity = "returning";
    state.remaining = returnDuration;
  } else {
    if (state.activity === "needs-attention") {
      state.workingSeconds = 0;
      state.faultAfter = faultInterval(state.hash, ++state.faultCount);
    }
    state.activity = "working";
    if (state.area === "Base") {
      state.area = areas[state.hash % areas.length];
    }
  }
}

export function advanceRobot(
  id: string,
  state: SimulatedRobot,
  seconds: number,
  now: number,
): TelemetryReport {
  // Bound catch-up after slow HTTP requests; phases advance in small steps.
  let remaining = Math.max(0, Math.min(5, seconds));

  while (remaining > 0) {
    const step = Math.min(1, remaining);
    remaining -= step;

    switch (state.activity) {
      case "idle":
        if (state.target === "work" && (state.remaining -= step) <= 0) {
          state.activity = "working";
          state.area = areas[state.hash % areas.length];
        }
        break;
      case "working":
        state.battery = Math.max(0, state.battery - step * dischargeRate);
        state.workingSeconds += step;
        state.area =
          areas[
            (state.hash + Math.floor(state.workingSeconds / 30)) % areas.length
          ];

        if (state.battery <= returnToBaseBattery) {
          state.activity = "returning";
          state.remaining = returnDuration;
        } else if (
          faultProne(state) &&
          state.workingSeconds >= state.faultAfter
        ) {
          state.activity = "needs-attention";
          state.problemCode =
            robotProblemCodes[
              (Math.floor(state.hash / 5) + state.faultCount) %
                robotProblemCodes.length
            ];
        }
        break;
      case "returning":
        state.battery = Math.max(0, state.battery - step * dischargeRate);

        if ((state.remaining -= step) <= 0) {
          state.area = "Base";
          state.activity = state.battery < chargedBattery ? "charging" : "idle";
          state.remaining = departureDelay;
        }
        break;
      case "charging":
        state.battery = Math.min(
          chargedBattery,
          state.battery + step * chargeRate,
        );

        if (state.battery >= chargedBattery) {
          state.activity = "idle";
          state.remaining = departureDelay;
        }
        break;
      // Faults and unknown activity hold until a control command changes them.
      case "needs-attention":
      case "unknown":
        break;
    }
  }

  return {
    robotId: id,
    activity: state.activity,
    batteryPercent: state.battery,
    area: state.area,
    problemCode:
      state.activity === "needs-attention" ? state.problemCode : null,
    appliedControlRevision: state.appliedRevision,
    observedAt: new Date(now).toISOString(),
  };
}

// Offline-prone robots stop reporting for 60s of every 180s cycle,
// phase-shifted per robot so they do not go silent together.
export function telemetryAvailable(state: SimulatedRobot, now: number) {
  const hash = state.connectionHash;
  return (
    !offlineProne(state) ||
    (Math.floor(now / 1000) + Math.floor(hash / 5)) % 180 >= 60
  );
}
