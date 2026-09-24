import type { Metadata } from "next";

import { CameraDetailView } from "@/components/views/camera-detail-view";

export const metadata: Metadata = { title: "Chi tiết camera" };

export default async function CameraDetailPage({ params }: PageProps<"/cameras/[id]">) {
  const { id } = await params;
  return <CameraDetailView id={id} />;
}
