import { apiPost, ApiError } from "./api-client";
import { whatsappDigits } from "./booking-confirmation-message";
import {
  splitWhatsAppMessage,
  WHATSAPP_SESSION_BODY_MAX,
} from "./whatsapp-message-split";
import { useCommunicationStore } from "@/store/communication-store";
import type { CustomerMessage } from "@/types";

/** wa.me `text=` query is length-limited; use clipboard above this threshold. */
const WA_ME_PREFILL_SAFE_MAX = 1500;

export async function sendCustomerWhatsApp(
  phone: string,
  message: string,
  template?: { contentSid?: string; contentVariables?: Record<string, string> }
): Promise<CustomerMessage | null> {
  const payload = template?.contentSid
    ? { phone, contentSid: template.contentSid, contentVariables: template.contentVariables }
    : { phone, message };

  const res = await apiPost<{ ok: true; message?: CustomerMessage }>("/api/messaging/whatsapp", payload);
  if (res.message) {
    useCommunicationStore.getState().addMessage(res.message);
    return res.message;
  }
  return null;
}

export type WhatsAppComposerResult = {
  /** Full message copied — paste manually in WhatsApp. */
  usedClipboard: boolean;
  /** Sent as multiple Twilio-safe parts when using API (informational for UI). */
  partCount: number;
};

export function openWhatsAppComposer(phone: string, message: string): WhatsAppComposerResult {
  const digits = whatsappDigits(phone);
  const partCount = splitWhatsAppMessage(message).length;
  const isTooLong = message.length > WA_ME_PREFILL_SAFE_MAX;
  if (isTooLong) {
    void navigator.clipboard?.writeText(message).catch(() => {});
  }
  const url = isTooLong
    ? `https://wa.me/${digits}`
    : `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

  if (typeof window !== "undefined") {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win || win.closed || typeof win.closed === "undefined") {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  return { usedClipboard: isTooLong, partCount };
}

export function isWhatsAppNotConfiguredError(e: unknown): boolean {
  return e instanceof ApiError && e.code === "WHATSAPP_NOT_CONFIGURED";
}

export { WHATSAPP_SESSION_BODY_MAX, splitWhatsAppMessage };
