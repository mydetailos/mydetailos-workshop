import { describe, expect, it } from "vitest";
import {
  gstHalfPercentLabel,
  splitCgstSgst,
  taxRateAsFraction,
  taxRateAsPercentLabel,
} from "@/lib/tax-invoice-format";

describe("formatInvoiceVehicleDetailsLine", () => {
  it("joins variant, year, fuel, and color", async () => {
    const { formatInvoiceVehicleDetailsLine } = await import("@/lib/tax-invoice-format");
    expect(
      formatInvoiceVehicleDetailsLine({
        variant: "EX",
        year: 2026,
        fuelType: "DIESEL",
        color: "Blue",
      })
    ).toBe("EX · 2026 · Diesel · Blue");
  });

  it("skips empty and placeholder color", async () => {
    const { formatInvoiceVehicleDetailsLine } = await import("@/lib/tax-invoice-format");
    expect(
      formatInvoiceVehicleDetailsLine({
        year: 2024,
        fuelType: "CNG",
        color: "—",
      })
    ).toBe("2024 · CNG");
  });
});

describe("splitCgstSgst", () => {
  it("splits tax evenly", () => {
    expect(splitCgstSgst(180)).toEqual({ cgst: 90, sgst: 90 });
    expect(splitCgstSgst(0)).toEqual({ cgst: 0, sgst: 0 });
  });
});

describe("taxRateAsFraction / labels", () => {
  it("normalizes percent and fraction inputs", () => {
    expect(taxRateAsFraction(0.18)).toBe(0.18);
    expect(taxRateAsFraction(18)).toBe(0.18);
    expect(taxRateAsFraction(0)).toBe(0);
    expect(taxRateAsPercentLabel(0.18)).toBe("18%");
    expect(taxRateAsPercentLabel(18)).toBe("18%");
    expect(gstHalfPercentLabel(0.18)).toBe("9%");
  });
});

describe("buildTaxInvoicePrintHtml signature options", () => {
  const dummyOpts = {
    invoice: {
      id: "inv-1",
      jobNumber: "JOB-101",
      customerName: "John Doe",
      customerPhone: "9876543210",
      vehicleMakeModel: "Hyundai Creta",
      vehicleRegNumber: "KA01AB1234",
      lineItems: [],
      subtotal: 1000,
      taxRate: 0.18,
      taxAmount: 180,
      grandTotal: 1180,
      status: "ISSUED" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    jobCard: null,
    customerName: "John Doe",
    customerPhone: "9876543210",
    customerEmail: "john@example.com",
    customerAddress: "Bangalore",
    vehicleMakeModel: "Hyundai Creta",
    business: {
      businessName: "PRIME DETAILING",
      businessTagline: "Premium Auto Spa",
      businessAddress: "123 Main St, Bangalore",
      businessPhone: "9999999999",
      businessWhatsApp: "9999999999",
      businessEmail: "info@prime.com",
      businessWebsite: "www.prime.com",
      gstin: "29AAAAA0000A1Z5",
      companyPan: "AAAAA0000A",
      bankName: "HDFC Bank",
      bankBranch: "Koramangala",
      bankAccountNumber: "123456789",
      bankIfsc: "HDFC0001234",
      bankUpi: "prime@upi",
    },
    payments: [],
    totalPaid: 1180,
    remainingBalance: 0,
  };

  it("renders a blank signature box by default for physical stamping and signing", async () => {
    const { buildTaxInvoicePrintHtml } = await import("@/lib/tax-invoice-format");
    const html = buildTaxInvoicePrintHtml(dummyOpts, { includePrintScript: false });
    expect(html).toContain("border-bottom: 1px dashed #a3a3a3");
    expect(html).toContain("Authorized Signatory");
    expect(html).toContain("PRIME DETAILING");
  });

  it("renders custom signature image when CUSTOM mode and URL are provided", async () => {
    const { buildTaxInvoicePrintHtml } = await import("@/lib/tax-invoice-format");
    const html = buildTaxInvoicePrintHtml(
      {
        ...dummyOpts,
        business: {
          ...dummyOpts.business,
          invoiceSignatureType: "CUSTOM",
          invoiceSignatureUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          invoiceSignatoryTitle: "Managing Director",
          invoiceSignatoryName: "Jane Smith",
        },
      },
      { includePrintScript: false }
    );
    expect(html).toContain('<img src="data:image/png;base64,');
    expect(html).toContain("Managing Director");
    expect(html).toContain("Jane Smith");
  });

  it("renders stylized SVG wave signature when STYLIZED mode is selected", async () => {
    const { buildTaxInvoicePrintHtml } = await import("@/lib/tax-invoice-format");
    const html = buildTaxInvoicePrintHtml(
      {
        ...dummyOpts,
        business: {
          ...dummyOpts.business,
          invoiceSignatureType: "STYLIZED",
        },
      },
      { includePrintScript: false }
    );
    expect(html).toContain('<svg width="120" height="40" viewBox="0 0 120 40"');
    expect(html).toContain("Authorized Signatory");
  });

  it("renders computer-generated notice when NONE is selected", async () => {
    const { buildTaxInvoicePrintHtml } = await import("@/lib/tax-invoice-format");
    const html = buildTaxInvoicePrintHtml(
      {
        ...dummyOpts,
        business: {
          ...dummyOpts.business,
          invoiceSignatureType: "NONE",
        },
      },
      { includePrintScript: false }
    );
    expect(html).toContain("Computer-generated invoice. No signature required.");
  });
});

