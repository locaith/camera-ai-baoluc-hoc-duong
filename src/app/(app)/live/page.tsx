import type { Metadata } from "next";

import { LiveView } from "@/components/views/live-view";

export const metadata: Metadata = { title: "Xem trực tiếp" };

export default function LivePage() {
  return <LiveView />;
}
