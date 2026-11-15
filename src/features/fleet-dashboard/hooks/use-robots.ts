"use client";
import { useEffect, useState } from "react";

import { robotPageSize } from "@/modules/robots/robot";

import { getRobots } from "../api/robot-api";
import type { RobotQueryState } from "../types/robot-query-state";

function lastRobotPage(total: number, pageSize: number) {
  return Math.max(0, Math.ceil(total / pageSize) - 1);
}

export default function useRobots() {
  const [request, setRequest] = useState({ page: 0, pageSize: robotPageSize });
  const [state, setState] = useState<RobotQueryState>({ status: "loading" });
  const [total, setTotal] = useState(0);
  const page = Math.min(request.page, lastRobotPage(total, request.pageSize));

  function setPage(page: number) {
    setState({ status: "loading" });
    // A fresh request object also allows refreshing the current page.
    setRequest((previous) => ({ ...previous, page }));
  }

  function setPageSize(pageSize: number) {
    setState({ status: "loading" });
    setRequest({ page: 0, pageSize });
  }

  useEffect(() => {
    const controller = new AbortController();
    void getRobots(request.page, request.pageSize, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setTotal(result.total);
        const lastPage = lastRobotPage(result.total, result.pageSize);
        if (request.page > lastPage && result.total > 0) {
          setRequest((previous) => ({ ...previous, page: lastPage }));
          return;
        }
        setState({ status: "success", robots: result.items });
      },
      () => {
        if (!controller.signal.aborted) setState({ status: "error" });
      },
    );
    return () => controller.abort();
  }, [request]);
  return {
    state,
    total,
    page,
    pageSize: request.pageSize,
    setPage,
    setPageSize,
    reload: () => setPage(page),
  };
}
