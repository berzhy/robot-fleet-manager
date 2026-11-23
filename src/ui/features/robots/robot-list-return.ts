import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

// In memory only, and never set on the server: a reload or a shared robot
// link opens the full list.
let lastListQuery = "";

export function useRememberRobotListView() {
  const query = useSearchParams().toString();
  useEffect(() => {
    lastListQuery = query;
  }, [query]);
}

/** The robot list as the user last left it in this tab. */
export function robotListHref() {
  return lastListQuery ? `/robots?${lastListQuery}` : "/robots";
}
