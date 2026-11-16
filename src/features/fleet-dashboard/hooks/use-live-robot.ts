"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import type { RobotContext } from "@/modules/robots/robot";
import { getRobotContext } from "../api/robot-api";
import { createPollingLoop } from "./polling-loop";

export default function useLiveRobot(initial: RobotContext, paused = false) {
  const [snapshot, setSnapshot] = useState(initial);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  const [interrupted, setInterrupted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unverified, setUnverified] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );

  const request = useRef<ReturnType<typeof createPollingLoop> | undefined>(
    undefined,
  );

  const invalidate = useCallback(() => {
    request.current?.cancel();
    setRefreshing(true);
  }, []);

  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (paused) return;

    let terminal = false;
    const polling = createPollingLoop(async (signal, cancelled) => {
      if (terminal || document.hidden) return false;

      try {
        const result = await getRobotContext(initial.robot.id, signal);
        if (cancelled()) return false;

        setRefreshing(false);
        if (!result) {
          terminal = true;
          setMissing(true);
          setInterrupted(false);
          setUnverified(false);
          return false;
        }

        setSnapshot(result);
        setInterrupted(false);
        setUnverified(false);
      } catch {
        if (cancelled()) return false;
        setRefreshing(false);
        setInterrupted(true);
        setUnverified(true);
      }

      return true;
    });
    request.current = polling;

    function visibility() {
      polling.cancel();
      setUnverified(true);
      if (!document.hidden) void polling.start();
    }

    void polling.start();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      polling.dispose();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [initial.robot.id, paused, revision]);

  return {
    ...snapshot,
    interrupted,
    refreshing,
    unverified,
    missing,
    reload,
    invalidate,
  };
}
