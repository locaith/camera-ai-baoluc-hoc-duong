"use client";

import { useRef, useState } from "react";
import { CircleCheck, CloudUpload, FileVideo, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/feedback";
import { uploadVideo } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { revalidate } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const ACCEPT = ".mp4,.mov,.m4v,.avi,.mkv,.webm,.mpg,.mpeg,.ts,.flv,.wmv,.3gp";

interface Item {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
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
        .then(() => {
          patch(id, { status: "done", progress: 100 });
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
          "brackets flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-8 text-center transition-colors",
          dragging ? "border-signal bg-signal/5" : "border-line-strong bg-bg/30",
        )}
        style={{ "--bracket": dragging ? "var(--signal)" : undefined } as React.CSSProperties}
      >
        <CloudUpload className={cn("size-8", dragging ? "text-signal" : "text-mute")} />
        <div>
          <p className="text-sm font-medium text-text">Kéo thả video vào đây để AI phân tích</p>
          <p className="mt-1 text-xs text-mute">
            MP4, MOV, AVI, MKV, WEBM… · lưu tạm trên máy chủ, AI xử lý xong sẽ tự đẩy lên R2 khi đầy
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          Chọn file
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
            <li key={item.id} className="flex items-center gap-3 rounded-md border border-line bg-bg/40 px-3 py-2">
              <FileVideo className="size-4 shrink-0 text-mute" />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3 text-[13px]">
                  <span className="truncate text-text">{item.file.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-mute">
                    {item.status === "uploading"
                      ? `${item.progress.toFixed(0)}% · ${formatBytes(item.file.size)}`
                      : formatBytes(item.file.size)}
                  </span>
                </div>
                {item.status === "uploading" && <Meter className="mt-1.5" value={item.progress} />}
                {item.status === "error" && <p className="mt-0.5 text-xs text-critical">{item.error}</p>}
                {item.status === "done" && <p className="mt-0.5 text-xs text-good">Đã tải lên · đang chờ AI phân tích</p>}
              </div>
              {item.status === "uploading" ? (
                <button
                  type="button"
                  onClick={() => item.abort?.()}
                  className="rounded p-1 text-mute hover:text-critical"
                  aria-label="Huỷ tải lên"
                >
                  <X className="size-4" />
                </button>
              ) : item.status === "done" ? (
                <CircleCheck className="size-4 text-good" />
              ) : (
                <TriangleAlert className="size-4 text-critical" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
