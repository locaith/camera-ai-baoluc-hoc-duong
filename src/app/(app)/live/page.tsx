import type { Metadata } from "next";

import { LiveView } from "@/components/views/live-view";

export const metadata: Metadata = { title: "Trực tiếp" };

export default function LivePage() {
  return <LiveView />;
}
