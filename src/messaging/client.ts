import type { Broadcast, Message, Response } from "./contracts";

export async function send<M extends Message>(message: M): Promise<Response<M>> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message ?? String(err)));
        return;
      }
      resolve(response as Response<M>);
    });
  });
}

export function onBroadcast(handler: (msg: Broadcast) => void): () => void {
  const listener = (message: unknown) => {
    if (
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      typeof (message as { type: unknown }).type === "string" &&
      ((message as { type: string }).type.startsWith("suggestions:") ||
        (message as { type: string }).type.startsWith("notes:") ||
        (message as { type: string }).type.startsWith("reminders:") ||
        (message as { type: string }).type.startsWith("prefs:") ||
        (message as { type: string }).type.startsWith("palette:"))
    ) {
      handler(message as Broadcast);
    }
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}

export function broadcast(message: Broadcast): void {
  // Fire-and-forget; surfaces may be closed.
  chrome.runtime.sendMessage(message).catch(() => {});
}
