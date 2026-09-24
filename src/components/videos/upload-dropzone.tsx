"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CircleCheck, CloudUpload, FileVideo, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/feedback";
import { uploadVideo } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { revalidate } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const ACCEPT = ".mp4,.mov,.m4v,.avi,.mkv,.webm,.mpg,.mpeg,.ts,.flv,.wmv,.3gp,video/*";

interface Item {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
  videoId?: string;
  abort?: () => void;
}

export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);

  function patch(id: string, change: Partial<Item>) {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }

  function start(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
      const { promise, abort } = uploadVideo(file, (fraction) => patch(id, { progress: fraction * 100 }));
      setItems((list) => [{ id, file, progress: 0, status: "uploading", abort }, ...list]);
      promise
        .then((video) => {
          patch(id, { status: "done", progress: 100, videoId: video.id });
          revalidate("/api/videos");
          revalidate("/api/storage");
        })
        .catch((error: Error) => patch(id, { status: "error", error: error.message }));
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) start(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-4 rounded-[20px] border border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-brand bg-brand-soft" : "border-hairline-2 bg-surface-2",
        )}
      >
        <span className={cn("grid size-12 place-items-center rounded-full", dragging ? "bg-brand text-white" : "bg-surface text-ink-2 shadow-soft")}>
          <CloudUpload className="size-5" strokeWidth={1.75} />
        </span>
        <div>
          <p className="font-serif text-[20px] text-ink">Kéo thả video vào đây</p>
          <p className="mt-1.5 text-[13px] text-ink-3">AI sẽ xem toàn bộ video và đánh dấu những đoạn cần chú ý</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          Chọn video từ máy
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) start(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3.5 rounded-2xl border border-hairline bg-surface px-4 py-3">
              <FileVideo className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate text-ink">{item.file.name}</span>
                  <span className="shrink-0 text-xs text-ink-3 tabular">
                    {item.status === "uploading"
                      ? `${item.progress.toFixed(0)}% · ${formatBytes(item.file.size)}`
                      : formatBytes(item.file.size)}
                  </span>
                </div>
                {item.status === "uploading" && <Meter className="mt-2" value={item.progress} tone="ink" />}
                {item.status === "error" && <p className="mt-1 text-xs text-critical">{item.error}</p>}
                {item.status === "done" && (
                  <p className="mt-1 text-xs text-success">
                    Đã tải lên · AI đang phân tích{" "}
                    {item.videoId && (
                      <Link href={`/videos/${item.videoId}`} className="font-medium underline underline-offset-2">
                        Xem
                      </Link>
                    )}
                  </p>
                )}
              </div>
              {item.status === "uploading" ? (
                <button
                  type="button"
                  onClick={() => item.abort?.()}
                  className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-3 hover:text-critical"
                  aria-label="Huỷ tải lên"
                >
                  <X className="size-4" />
                </button>
              ) : item.status === "done" ? (
                <CircleCheck className="size-5 text-success" />
              ) : (
                <TriangleAlert className="size-5 text-critical" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
