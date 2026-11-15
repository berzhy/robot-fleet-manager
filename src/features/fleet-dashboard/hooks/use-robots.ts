"use client";
import { useEffect, useRef, useState } from "react";
import { robotPageSize } from "@/modules/robots/robot";
import { getRobots } from "../api/robot-api";
import type { RobotQueryState } from "../types/robot-query-state";
function lastRobotPage(total: number, pageSize: number) {
  return Math.max(0, Math.ceil(total / pageSize) - 1);
}
export default function useRobots(paused = false) {
  const [request, setRequest] = useState({ page: 0, pageSize: robotPageSize });
  const [state, setState] = useState<RobotQueryState>({ status: "loading" });
  const [total, setTotal] = useState(0);
  const [interrupted, setInterrupted] = useState(false);
  const [hidden, setHidden] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  const [verifiedAt, setVerifiedAt] = useState(0);
  const active = useRef<AbortController | null>(null);
  const page = Math.min(request.page, lastRobotPage(total, request.pageSize));
  function invalidate() {
    active.current?.abort();
  }
  function setPage(page: number) {
    invalidate();
    setState({ status: "loading" });
    setRequest((previous) => ({ ...previous, page }));
  }
  function setPageSize(pageSize: number) {
    invalidate();
    setState({ status: "loading" });
    setRequest({ page: 0, pageSize });
  }
  function reload() {
    invalidate();
    setRequest((previous) => ({ ...previous, page }));
  }
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    function stop() {
      clearTimeout(timer);
      active.current?.abort();
    }
    async function poll() {
      if (disposed || paused || document.hidden) return;
      const controller = new AbortController();
      active.current = controller;
      try {
        const result = await getRobots(
          request.page,
          request.pageSize,
          AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
        );
        if (controller.signal.aborted || disposed) return;
        setTotal(result.total);
        const last = lastRobotPage(result.total, result.pageSize);
        if (request.page > last && result.total > 0) {
          setState({ status: "loading" });
          setRequest((previous) => ({ ...previous, page: last }));
          return;
        }
        setState({ status: "success", robots: result.items });
        setInterrupted(false);
        setVerifiedAt(Date.now());
        setHidden(false);
      } catch {
        if (controller.signal.aborted || disposed) return;
        setInterrupted(true);
        setState((previous) =>
          previous.status === "success" ? previous : { status: "error" },
        );
      }
      if (!disposed && !controller.signal.aborted)
        timer = setTimeout(() => void poll(), 5000);
    }
    function visibility() {
      stop();
      setHidden(true);
      if (!document.hidden) void poll();
    }
    void poll();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [request, paused]);
  return {
    state,
    total,
    page,
    pageSize: request.pageSize,
    setPage,
    setPageSize,
    reload,
    invalidate,
    interrupted,
    unverified: interrupted || hidden,
    verifiedAt,
  };
}
