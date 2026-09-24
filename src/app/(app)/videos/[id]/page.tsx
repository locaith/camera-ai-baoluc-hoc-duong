import type { Metadata } from "next";

import { VideoDetailView } from "@/components/views/video-detail-view";

export const metadata: Metadata = { title: "Video" };

export default async function VideoDetailPage({ params }: PageProps<"/videos/[id]">) {
  const { id } = await params;
  return <VideoDetailView id={id} />;
}
