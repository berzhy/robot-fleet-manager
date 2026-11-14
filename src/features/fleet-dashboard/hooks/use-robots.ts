"use client";

import { useEffect, useState } from "react";

import { getRobots } from "../api/robot-query";
import type { DemoScenario, RobotQueryState } from "../types/robot";

export default function useRobots() {
  const [request, setRequest] = useState<{
    scenario: DemoScenario;
    attempt: number;
  }>({ scenario: "success", attempt: 0 });
  const [state, setState] = useState<RobotQueryState>({ status: "loading" });

  function setScenario(scenario: DemoScenario) {
    setState({ status: "loading" });
    setRequest((previous) => ({ scenario, attempt: previous.attempt + 1 }));
  }

  useEffect(() => {
    let active = true;
    void getRobots(request.scenario).then(
      (robots) => {
        if (active) setState({ status: "success", robots });
      },
      () => {
        if (active) setState({ status: "error" });
      },
    );
    return () => {
      active = false;
    };
  }, [request]);

  return {
    state,
    scenario: request.scenario,
    setScenario,
    reload: () => setScenario(request.scenario),
  };
}
