import { Suspense } from "react";
import type { Metadata } from "next";

import { IncidentsView } from "@/components/views/incidents-view";

export const metadata: Metadata = { title: "Sự việc" };

export default function IncidentsPage() {
  return (
    <Suspense>
      <IncidentsView />
    </Suspense>
  );
}
