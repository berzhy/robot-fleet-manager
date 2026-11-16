"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import type { RobotContext } from "@/modules/robots/robot";
import { getRobotContext } from "../api/robot-api";
export default function useLiveRobot(initial: RobotContext, paused = false) {
  const [snapshot, setSnapshot] = useState(initial);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const [interrupted, setInterrupted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unverified, setUnverified] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  const request = useRef<AbortController | undefined>(undefined);
  const invalidate = useCallback(() => {
    request.current?.abort();
    setRefreshing(true);
  }, []);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (paused) return;
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
      request.current = current;
      try {
        const result = await getRobotContext(
          initial.robot.id,
          AbortSignal.any([current.signal, AbortSignal.timeout(5000)]),
        );
        if (disposed || current.signal.aborted) return;
        setRefreshing(false);
        if (!result) {
          terminal = true;
          setMissing(true);
          setInterrupted(false);
          setUnverified(false);
          return;
        }
        setSnapshot(result);
        setInterrupted(false);
        setUnverified(false);
      } catch {
        if (disposed || current.signal.aborted) return;
        setRefreshing(false);
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
