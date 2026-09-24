import type { Metadata } from "next";

import { StorageView } from "@/components/views/storage-view";

export const metadata: Metadata = { title: "Lưu trữ" };

export default function StoragePage() {
  return <StorageView />;
}
