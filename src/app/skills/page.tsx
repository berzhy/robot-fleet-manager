import type { Metadata } from "next";

import Skills from "@/ui/features/skills/skills";

export const metadata: Metadata = { title: "Skills" };

export default function Page() {
  return <Skills />;
}
