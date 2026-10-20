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
      invoiceNumber: "INV-2026-0001",
      customerId: "c-1",
      jobNumber: "JOB-101",
      customerName: "John Doe",
      customerPhone: "9876543210",
      vehicleRegNumber: "KA01AB1234",
      lineItems: [],
      subtotal: 1000,
      taxRate: 0.18,
      taxAmount: 180,
      discountAmount: 0,
      rewardDiscount: 0,
      walletAmountUsed: 0,
      grandTotal: 1180,
      status: "ISSUED" as const,
      payments: [],
      createdAt: new Date().toISOString(),
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

describe("filterCustomerFacingNotes", () => {
  it("filters out internal notes with various prefixes and keeps customer notes", async () => {
    const { filterCustomerFacingNotes } = await import("@/lib/tax-invoice-format");
    const raw = [
      "Customer: Scratch on bumper",
      "Low fuel",
      "Customer waiting",
      "Scratch on bumper",
      "Internal: Yayayahaan",
      "Internal Note: Staff confidential",
      "[Internal] Check underbody",
    ].join("\n");

    const filtered = filterCustomerFacingNotes(raw);
    expect(filtered).toEqual(["Scratch on bumper", "Low fuel", "Customer waiting"]);
    expect(filtered).not.toContain("Yayayahaan");
    expect(filtered).not.toContain("Internal: Yayayahaan");
  });

  it("handles multi-line internal note blocks until next section", async () => {
    const { filterCustomerFacingNotes } = await import("@/lib/tax-invoice-format");
    const raw = [
      "Customer: Please wash carefully",
      "Internal:",
      "Staff note line 1",
      "Staff note line 2",
      "",
      "Coupon: DISC10 (-₹500)",
    ].join("\n");

    const filtered = filterCustomerFacingNotes(raw);
    expect(filtered).toEqual(["Please wash carefully", "Coupon: DISC10 (-₹500)"]);
  });

  it("returns empty array when only internal notes are present", async () => {
    const { filterCustomerFacingNotes } = await import("@/lib/tax-invoice-format");
    expect(filterCustomerFacingNotes("Internal: Yayayahaan")).toEqual([]);
    expect(filterCustomerFacingNotes("")).toEqual([]);
    expect(filterCustomerFacingNotes(null)).toEqual([]);
  });
});

describe("buildTaxInvoicePrintHtml notes filtering", () => {
  const dummyOpts = {
    invoice: {
      id: "inv-2026-0002",
      invoiceNumber: "INV-2026-0002",
      customerId: "c-1",
      jobNumber: "JOB-2026-0002",
      customerName: "John Doe",
      customerPhone: "9876543210",
      vehicleRegNumber: "KA01AB1234",
      lineItems: [],
      subtotal: 1000,
      taxRate: 0.18,
      taxAmount: 180,
      discountAmount: 0,
      rewardDiscount: 0,
      walletAmountUsed: 0,
      grandTotal: 1180,
      status: "ISSUED" as const,
      payments: [],
      notes: "Customer: Scratch on bumper\nLow fuel\nCustomer waiting\nInternal: Yayayahaan",
      termsAndConditions: "Vehicle will be kept in secure parking.",
      createdAt: new Date().toISOString(),
    },
    jobCard: {
      id: "jc-1",
      jobNumber: "JOB-2026-0002",
      branchId: "b-1",
      customerId: "c-1",
      customerName: "John Doe",
      customerPhone: "9876543210",
      vehicleId: "v-1",
      vehicleRegNumber: "KA01AB1234",
      vehicleMakeModel: "Hyundai Creta",
      vehicleSegment: "SUV" as const,
      status: "READY" as const,
      reportedIssues: "None",
      expectedDelivery: new Date().toISOString(),
      services: [],
      estimatedAmount: 1000,
      incentivePercent: 0,
      incentiveAmount: 0,
      notes: "Customer: Scratch on bumper\nLow fuel\nCustomer waiting\nInternal: Yayayahaan",
      termsAndConditions: "Vehicle will be kept in secure parking.",
    },
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
    totalPaid: 0,
    remainingBalance: 1180,
  };

  it("does not render internal notes in the invoice HTML", async () => {
    const { buildTaxInvoicePrintHtml } = await import("@/lib/tax-invoice-format");
    const html = buildTaxInvoicePrintHtml(dummyOpts, { includePrintScript: false });

    // Internal notes must NEVER be visible
    expect(html).not.toContain("Yayayahaan");
    expect(html).not.toContain("Internal:");

    // Customer notes must be present
    expect(html).toContain("NOTES & SPECIAL INSTRUCTIONS");
    expect(html).toContain("Scratch on bumper");
    expect(html).toContain("Low fuel");
    expect(html).toContain("Customer waiting");

    // Must not duplicate items between invoice and jobCard
    const scratchMatches = html.match(/Scratch on bumper/g);
    expect(scratchMatches?.length).toBe(1);
  });

  it("omits the notes section if only internal notes exist", async () => {
    const { buildTaxInvoicePrintHtml } = await import("@/lib/tax-invoice-format");
    const html = buildTaxInvoicePrintHtml(
      {
        ...dummyOpts,
        invoice: {
          ...dummyOpts.invoice,
          notes: "Internal: Staff note only",
          termsAndConditions: undefined,
        },
        jobCard: null,
      },
      { includePrintScript: false }
    );

    expect(html).not.toContain("NOTES & SPECIAL INSTRUCTIONS");
    expect(html).not.toContain("Staff note only");
  });
});

describe("buildTaxInvoicePrintHtml organization branding & logo", () => {
  const testOpts = {
    invoice: {
      id: "inv-brand-1",
      invoiceNumber: "INV-2026-0002",
      customerId: "c-1",
      jobNumber: "JOB-102",
      customerName: "Jane Doe",
      customerPhone: "9876543210",
      vehicleRegNumber: "KA01AB1234",
      lineItems: [],
      subtotal: 1000,
      taxRate: 0.18,
      taxAmount: 180,
      discountAmount: 0,
      rewardDiscount: 0,
      walletAmountUsed: 0,
      grandTotal: 1180,
      status: "ISSUED" as const,
      payments: [],
      createdAt: new Date().toISOString(),
    },
    jobCard: null,
    customerName: "Jane Doe",
    customerPhone: "9876543210",
    customerEmail: "jane@example.com",
    customerAddress: "Bangalore",
    vehicleMakeModel: "Honda City",
    business: {
      gstRegistrationStatus: "REGISTERED" as const,
      businessName: "Super Car Spa & Detailing",
      businessTagline: "Professional Auto Care",
      businessAddress: "Koramangala, Bangalore",
      businessPhone: "9876543210",
      businessWhatsApp: "9876543210",
      businessEmail: "info@supercarspa.com",
      businessWebsite: "www.supercarspa.com",
      gstin: "29AAAAA0000A1Z5",
      companyPan: "AAAAA0000A",
      bankName: "HDFC Bank",
      bankBranch: "Koramangala",
      bankAccountNumber: "1234567890",
      bankIfsc: "HDFC0001234",
      bankUpi: "9876543210@upi",
    },
    payments: [],
    totalPaid: 0,
    remainingBalance: 1180,
  };

  it("renders organization business name and does not hardcode MYDETAILOS in logo SVG", async () => {
    const { buildTaxInvoicePrintHtml } = await import("@/lib/tax-invoice-format");
    const html = buildTaxInvoicePrintHtml(
      {
        ...testOpts,
        business: {
          ...testOpts.business,
          businessName: "Super Car Spa & Detailing",
        },
      },
      { includePrintScript: false }
    );

    expect(html).toContain("Super Car Spa &amp; Detailing");
    expect(html).not.toContain(">MYDETAILOS<");
  });

  it("renders custom business logo img when logoUrl is provided", async () => {
    const { buildTaxInvoicePrintHtml } = await import("@/lib/tax-invoice-format");
    const html = buildTaxInvoicePrintHtml(
      {
        ...testOpts,
        business: {
          ...testOpts.business,
          businessName: "Elite Detailing",
          logoUrl: "https://example.com/logo.png",
        },
      },
      { includePrintScript: false }
    );

    expect(html).toContain('<img class="brand-logo" src="https://example.com/logo.png"');
    expect(html).toContain('alt="Elite Detailing"');
  });

  it("renders voucher discount line with coupon code when applied", async () => {
    const { buildTaxInvoicePrintHtml } = await import("@/lib/tax-invoice-format");
    const html = buildTaxInvoicePrintHtml(
      {
        ...testOpts,
        invoice: {
          ...testOpts.invoice,
          subtotal: 35000,
          discountAmount: 3500,
          couponCode: "SAVE10",
          taxRate: 0.18,
          taxAmount: 5670,
          grandTotal: 37170,
        },
      },
      { includePrintScript: false }
    );

    expect(html).toContain("Voucher Discount (SAVE10):");
    expect(html).toContain("- ₹3,500");
  });
});

