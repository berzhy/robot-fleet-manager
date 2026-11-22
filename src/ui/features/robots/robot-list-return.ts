import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

// The way back from a robot to the list, shared by the two screens rather than
// owned by either. In memory only: a reload or a shared robot link opens the
// full list, and the server never sets it.
let lastListQuery = "";

/** Remembers the list's view for robotListHref; the list page calls it once. */
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
