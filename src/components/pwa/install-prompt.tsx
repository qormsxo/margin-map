"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isBeforeInstallPromptEvent(
  event: Event,
): event is BeforeInstallPromptEvent {
  return "prompt" in event && "userChoice" in event;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();

      if (!isBeforeInstallPromptEvent(event)) return;

      setDeferred(event);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!deferred || hidden) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-40 rounded-xl border border-sky-500/40 bg-slate-950/95 p-3 shadow-lg backdrop-blur sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-80">
      <p className="text-sm font-medium text-slate-100">MarginMap 설치</p>
      <p className="mt-1 text-xs text-slate-400">
        홈 화면에 추가하면 앱처럼 바로 열 수 있습니다.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-slate-950"
          onClick={() => {
            void deferred.prompt().then(async () => {
              await deferred.userChoice;
              setDeferred(null);
            });
          }}
        >
          설치
        </button>
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-xs text-slate-400"
          onClick={() => setHidden(true)}
        >
          나중에
        </button>
      </div>
    </div>
  );
}
