import type { Metadata } from "next";

import { VideosView } from "@/components/views/videos-view";

export const metadata: Metadata = { title: "Video" };

export default function VideosPage() {
  return <VideosView />;
}
