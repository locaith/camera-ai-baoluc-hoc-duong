import { Suspense } from "react";
import type { Metadata } from "next";

import { EventsView } from "@/components/views/events-view";

export const metadata: Metadata = { title: "Cảnh báo" };

export default function EventsPage() {
  return (
    <Suspense>
      <EventsView />
    </Suspense>
  );
}
