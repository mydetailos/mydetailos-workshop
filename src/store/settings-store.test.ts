import { describe, expect, it } from "vitest";
import {
  mergeAppSettingsPayload,
  useSettingsStore,
  DEFAULT_SERIALIZABLE_APP_SETTINGS,
} from "./settings-store";

describe("settings-store invoice settings", () => {
  it("has BLANK as default invoiceSignatureType", () => {
    expect(DEFAULT_SERIALIZABLE_APP_SETTINGS.invoiceSignatureType).toBe("BLANK");
    expect(DEFAULT_SERIALIZABLE_APP_SETTINGS.invoiceSignatoryTitle).toBe("Authorized Signatory");
    expect(DEFAULT_SERIALIZABLE_APP_SETTINGS.invoiceSignatureUrl).toBe("");
  });

  it("merges invoice settings from raw payload", () => {
    const merged = mergeAppSettingsPayload({
      invoiceSignatureType: "CUSTOM",
      invoiceSignatureUrl: "https://example.com/signature.png",
      invoiceSignatoryTitle: "Managing Partner",
      invoiceSignatoryName: "John Smith",
    });

    expect(merged.invoiceSignatureType).toBe("CUSTOM");
    expect(merged.invoiceSignatureUrl).toBe("https://example.com/signature.png");
    expect(merged.invoiceSignatoryTitle).toBe("Managing Partner");
    expect(merged.invoiceSignatoryName).toBe("John Smith");
  });

  it("updates store via setInvoiceSettings", () => {
    const store = useSettingsStore.getState();
    store.setInvoiceSettings({
      invoiceSignatureType: "BLANK",
      invoiceSignatoryTitle: "Workshop Manager",
    });

    const updated = useSettingsStore.getState();
    expect(updated.invoiceSignatureType).toBe("BLANK");
    expect(updated.invoiceSignatoryTitle).toBe("Workshop Manager");
  });
});
