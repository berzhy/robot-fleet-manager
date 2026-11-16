import { useEffect, useEffectEvent, useState } from "react";

export default function usePageVisibility(onChange: () => void) {
  const [hidden, setHidden] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );

  const changed = useEffectEvent(onChange);

  useEffect(() => {
    function visibility() {
      changed();
      setHidden(document.hidden);
    }

    document.addEventListener("visibilitychange", visibility);

    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);

  return hidden;
}
