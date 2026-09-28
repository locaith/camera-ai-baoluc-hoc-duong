import type { Metadata } from "next";

import { CameraStreamView } from "@/components/views/camera-stream-view";

export const metadata: Metadata = { title: "Phát camera từ máy này" };

export default async function CameraStreamPage({ params }: PageProps<"/cameras/[id]/stream">) {
  const { id } = await params;
  return <CameraStreamView id={id} />;
}
