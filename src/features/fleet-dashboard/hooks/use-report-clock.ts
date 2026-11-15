"use client";
import { useEffect, useState } from "react";
export default function useReportClock(paused = false) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    function update() {
      if (!paused && !document.hidden) setNow(Date.now());
    }
    const timer = setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [paused]);
  return now;
}
