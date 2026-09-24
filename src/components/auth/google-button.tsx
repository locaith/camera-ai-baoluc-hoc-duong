"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Script from "next/script";

interface CredentialResponse {
  credential: string;
}

interface GoogleIdentity {
  initialize(config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    context?: "signin" | "signup" | "use";
    itp_support?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}

export function disableGoogleAutoSelect() {
  try {
    window.google?.accounts.id.disableAutoSelect();
  } catch {
    /* ignore */
  }
}

/**
 * Nút "Tiếp tục với Google" (Google Identity Services).
 * Trả về ID token; máy chủ tự xác minh chữ ký với Google nên không cần client secret.
 */
export function GoogleButton({
  clientId,
  onCredential,
}: {
  clientId: string;
  onCredential: (credential: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.google?.accounts?.id),
  );
  const handleCredential = useEffectEvent((credential: string) => onCredential(credential));

  useEffect(() => {
    const google = window.google;
    const target = ref.current;
    if (!ready || !google || !target || !clientId) return;

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => handleCredential(response.credential),
      ux_mode: "popup",
      auto_select: false,
      context: "signin",
      itp_support: true,
    });
    target.innerHTML = "";
    google.accounts.id.renderButton(target, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: 320,
      locale: "vi",
    });
  }, [ready, clientId]);

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
        onReady={() => setReady(true)}
      />
      <div className="flex min-h-11 justify-center">
        <div ref={ref} />
        {!ready && <div className="h-11 w-[320px] animate-pulse rounded bg-panel-3" aria-label="Đang tải đăng nhập Google" />}
      </div>
    </>
  );
}
