"use client";
import { useEffect, useState } from "react";
import type { Robot } from "@/modules/robots/robot";
import { getRobot } from "../api/robot-api";
export default function useLiveRobot(
  initial: Robot,
  initialVerifiedAt: number,
) {
  const [robot, setRobot] = useState(initial);
  const [interrupted, setInterrupted] = useState(false);
  const [unverified, setUnverified] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  const [missing, setMissing] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState(initialVerifiedAt);
  useEffect(() => {
    let disposed = false;
    let terminal = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    function stop() {
      clearTimeout(timer);
      controller?.abort();
    }
    async function poll() {
      if (disposed || terminal || document.hidden) return;
      const current = new AbortController();
      controller = current;
      try {
        const result = await getRobot(
          initial.id,
          AbortSignal.any([current.signal, AbortSignal.timeout(5000)]),
        );
        if (disposed || current.signal.aborted) return;
        if (!result) {
          terminal = true;
          setMissing(true);
          setInterrupted(false);
          setUnverified(false);
          return;
        }
        setRobot(result);
        setInterrupted(false);
        setUnverified(false);
        setVerifiedAt(Date.now());
      } catch {
        if (disposed || current.signal.aborted) return;
        setInterrupted(true);
        setUnverified(true);
      }
      if (!disposed && !current.signal.aborted)
        timer = setTimeout(() => void poll(), 5000);
    }
    function visibility() {
      stop();
      setUnverified(true);
      if (!document.hidden) void poll();
    }
    void poll();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [initial.id]);
  return { robot, interrupted, unverified, verifiedAt, missing };
}
