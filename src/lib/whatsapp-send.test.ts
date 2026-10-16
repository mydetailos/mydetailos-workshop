// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { whatsappDigits } from "./booking-confirmation-message";
import { openWhatsAppComposer } from "./whatsapp-send";

describe("whatsappDigits", () => {
  it("normalizes standard 10-digit Indian numbers with 91 prefix", () => {
    expect(whatsappDigits("9876543210")).toBe("919876543210");
  });

  it("handles numbers with spaces, dashes, and parentheses", () => {
    expect(whatsappDigits("+91 (98765) 43210")).toBe("919876543210");
    expect(whatsappDigits("98765-43210")).toBe("919876543210");
  });

  it("strips trunk prefix 0 from 11-digit numbers", () => {
    expect(whatsappDigits("09876543210")).toBe("919876543210");
  });

  it("handles 910 prefix from accidental leading 0 with country code", () => {
    expect(whatsappDigits("+91 09876543210")).toBe("919876543210");
  });

  it("handles international prefix 00", () => {
    expect(whatsappDigits("00919876543210")).toBe("919876543210");
  });

  it("preserves numbers already having 91 prefix", () => {
    expect(whatsappDigits("919876543210")).toBe("919876543210");
  });

  it("preserves non-Indian international numbers", () => {
    expect(whatsappDigits("+1 415 555 2671")).toBe("14155552671");
  });
});

describe("openWhatsAppComposer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("opens wa.me URL with phone digits and encoded message", () => {
    const openSpy = vi.fn().mockReturnValue({ closed: false });
    window.open = openSpy;

    const result = openWhatsAppComposer("9876543210", "Hello World! Test & Demo");
    expect(result.usedClipboard).toBe(false);
    expect(openSpy).toHaveBeenCalledWith(
      "https://wa.me/919876543210?text=Hello%20World!%20Test%20%26%20Demo",
      "_blank",
      "noopener,noreferrer"
    );
  });
});
