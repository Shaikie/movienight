"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const DISMISS_KEY = "movienight-install-dismissed";

export default function PwaInstall() {
  const [promptEvent, setPromptEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(true);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true);
    // Browser-only state: no hydration-dependent markup.
    setTimeout(() => {
      setInstalled(standalone);
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "yes");
    }, 0);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed || !promptEvent) return null;
  return (
    <aside className="mn-install-banner mn-install-single" aria-label="Install MovieNight">
      <div className="mn-install-symbol" aria-hidden="true">▶</div>
      <div className="mn-install-copy">
        <strong>MovieNight on your home screen</strong>
        <p>Install for quicker access to screenings and reservations.</p>
      </div>
      <button
        type="button"
        className="mn-button mn-button-small"
        onClick={async () => {
          try {
            await promptEvent.prompt();
            const choice = await promptEvent.userChoice;
            if (choice.outcome === "dismissed") {
              sessionStorage.setItem(DISMISS_KEY, "yes");
              setDismissed(true);
            }
          } finally {
            setPromptEvent(null);
          }
        }}
      >
        <Download size={16} /> Install
      </button>
      <button
        type="button"
        className="mn-install-close"
        aria-label="Dismiss install suggestion"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "yes");
          setDismissed(true);
        }}
      >
        <X size={18} />
      </button>
    </aside>
  );
}
