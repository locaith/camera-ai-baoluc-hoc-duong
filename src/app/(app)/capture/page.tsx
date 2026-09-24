import type { Metadata } from "next";

import { CaptureView } from "@/components/views/capture-view";

export const metadata: Metadata = { title: "Quay tại chỗ" };

export default function CapturePage() {
  return <CaptureView />;
}
