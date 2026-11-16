"use client";
import { useEffect, useRef, useState } from "react";
import type { RobotFilters } from "@/modules/robots/robot-filters";
import type { RobotPage } from "@/modules/robots/robot";
import { robotPageSize } from "@/modules/robots/robot";
import { getRobots } from "../api/robot-api";
import type { RobotQueryState } from "../types/robot-query-state";
function lastRobotPage(total: number, pageSize: number) {
  return Math.max(0, Math.ceil(total / pageSize) - 1);
}
export default function useRobots(paused = false) {
  const [request, setRequest] = useState<{
    page: number;
    pageSize: number;
    filters: RobotFilters;
  }>({ page: 0, pageSize: robotPageSize, filters: { view: "all" } });
  const [state, setState] = useState<RobotQueryState>({ status: "loading" });
  const [interrupted, setInterrupted] = useState(false);
  const [hidden, setHidden] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  const [snapshot, setSnapshot] = useState<RobotPage | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const announceNext = useRef(false);
  const total = snapshot?.total ?? 0;
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
    setRequest((previous) => ({ ...previous, page: 0, pageSize }));
  }
  function setFilters(filters: RobotFilters) {
    announceNext.current = true;
    setAnnouncement("");
    invalidate();
    setState({ status: "loading" });
    setRequest((previous) => ({ ...previous, page: 0, filters }));
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
          request.filters,
        );
        if (controller.signal.aborted || disposed) return;
        const last = lastRobotPage(result.total, result.pageSize);
        if (request.page > last) {
          setState({ status: "loading" });
          setRequest((previous) => ({ ...previous, page: last }));
          return;
        }
        if (announceNext.current) {
          setAnnouncement(
            `${result.total} ${result.total === 1 ? "robot" : "robots"} found.`,
          );
          announceNext.current = false;
        }
        setState({ status: "success", robots: result.items });
        setInterrupted(false);
        setSnapshot(result);
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
    announcement,
    total,
    page,
    pageSize: request.pageSize,
    setPage,
    setPageSize,
    reload,
    invalidate,
    interrupted,
    unverified: interrupted || hidden,
    verifiedAt: snapshot?.evaluatedAt ?? 0,
    snapshot,
    filters: request.filters,
    setFilters,
  };
}
