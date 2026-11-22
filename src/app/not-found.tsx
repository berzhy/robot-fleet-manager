import type { Metadata } from "next";

import NotFoundContent from "@/shared/not-found/not-found-content";

export const metadata: Metadata = { title: "Page not found" };

export default function PageNotFound() {
  return <NotFoundContent title="Page not found" robotsHref="/robots" />;
}
