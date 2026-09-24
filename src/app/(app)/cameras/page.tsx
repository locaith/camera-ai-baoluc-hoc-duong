import { Suspense } from "react";
import type { Metadata } from "next";

import { CamerasView } from "@/components/views/cameras-view";

export const metadata: Metadata = { title: "Camera" };

export default function CamerasPage() {
  return (
    <Suspense>
      <CamerasView />
    </Suspense>
  );
}
