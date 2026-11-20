import { useEffect, useState } from "react";
import type { ToastAction } from "../components/Toast";
import type { PakoMood } from "../components/onboarding/storyTypes";

export type ToastNotice = {
  message: string;
  /** How Pako brings the note; he stands calmly unless the news is a small joy. */
  mood?: PakoMood;
  /** A way to act on the news, such as undoing it; the note then stays longer. */
  action?: ToastAction;
  /** The favourite this note confirms; removing it again takes the note back. */
  savedFavorite?: string;
};

export type Toasts = ReturnType<typeof useToast>;

/** The app's one note at a time: it leaves by itself, later when it offers an action. */
export function useToast() {
  const [notice, setNotice] = useState<ToastNotice | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), notice.action ? 10000 : 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const failed = () =>
      setNotice({
        message:
          "Browser storage is full. Your latest changes have not been saved for the next visit.",
      });
    window.addEventListener("storage-failure", failed);
    return () => window.removeEventListener("storage-failure", failed);
  }, []);
  return {
    notice,
    show: setNotice,
    /** A plain note; an empty message takes the current one away. */
    say(message: string) {
      setNotice(message ? { message } : null);
    },
  };
}
