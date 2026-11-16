"use client";
import { useEffect, useRef, useState } from "react";
import type { RobotFilters } from "@/modules/robots/robot-filters";
import type { RobotPage } from "@/modules/robots/robot";
import { robotPageSize } from "@/modules/robots/robot";
import { getRobots } from "../api/robot-api";
import type { RobotQueryState } from "../types/robot-query-state";
import { createPollingLoop } from "./polling-loop";
function lastRobotPage(total: number, pageSize: number) {
  return Math.max(0, Math.ceil(total / pageSize) - 1);
}
export default function useRobots(paused = false) {
  const [request, setRequest] = useState<{
    page: number;
    pageSize: number;
    filters: RobotFilters;
  }>({ page: 0, pageSize: robotPageSize, filters: { view: "all" } });
  const [status, setStatus] = useState<RobotQueryState["status"]>("loading");
  const [interrupted, setInterrupted] = useState(false);
  const [hidden, setHidden] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  const [snapshot, setSnapshot] = useState<RobotPage | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const announceNext = useRef(false);
  const total = snapshot?.total ?? 0;
  const active = useRef<ReturnType<typeof createPollingLoop> | null>(null);
  const page = Math.min(request.page, lastRobotPage(total, request.pageSize));
  function invalidate() {
    active.current?.cancel();
  }
  function setPage(page: number) {
    invalidate();
    setStatus("loading");
    setRequest((previous) => ({ ...previous, page }));
  }
  function setPageSize(pageSize: number) {
    invalidate();
    setStatus("loading");
    setRequest((previous) => ({ ...previous, page: 0, pageSize }));
  }
  function setFilters(filters: RobotFilters) {
    announceNext.current = true;
    setAnnouncement("");
    invalidate();
    setStatus("loading");
    setRequest((previous) => ({ ...previous, page: 0, filters }));
  }
  function reload() {
    invalidate();
    setRequest((previous) => ({ ...previous, page }));
  }
  useEffect(() => {
    const polling = createPollingLoop(async (signal, cancelled) => {
      if (paused || document.hidden) return false;
      try {
        const result = await getRobots(
          request.page,
          request.pageSize,
          signal,
          request.filters,
        );
        if (cancelled()) return false;
        const last = lastRobotPage(result.total, result.pageSize);
        if (request.page > last) {
          setStatus("loading");
          setRequest((previous) => ({ ...previous, page: last }));
          return false;
        }
        if (announceNext.current) {
          setAnnouncement(
            `${result.total} ${result.total === 1 ? "robot" : "robots"} found.`,
          );
          announceNext.current = false;
        }
        setStatus("success");
        setInterrupted(false);
        setSnapshot(result);
        setHidden(false);
      } catch {
        if (cancelled()) return false;
        setInterrupted(true);
        setStatus((previous) => (previous === "success" ? previous : "error"));
      }
      return true;
    });
    active.current = polling;
    function visibility() {
      polling.cancel();
      setHidden(true);
      if (!document.hidden) void polling.start();
    }
    void polling.start();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      polling.dispose();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [request, paused]);
  const state: RobotQueryState =
    status === "success" && snapshot
      ? { status, robots: snapshot.items }
      : { status: status === "error" ? "error" : "loading" };
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
