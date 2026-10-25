import { describe, it, expect } from "vitest";
import {
  generateSubscriptionTaxInvoiceHtml,
  generateSubscriptionInvoiceWhatsAppText,
  buildPublicSubscriptionInvoiceUrl,
  parseSubscriptionInvoiceFromHash,
  formatInvoiceAmount,
  formatInvoiceDate,
  formatInvoiceNumber,
} from "./subscription-tax-invoice";
import type { SubscriptionBillRow } from "@/types";

describe("subscription-tax-invoice", () => {
  const sampleBill: SubscriptionBillRow & { organizationName?: string } = {
    id: "bill-1",
    billNumber: "SUB-2026-0001",
    planName: "Pro Plus Workshop",
    termMonths: 12,
    termLabel: "Yearly",
    periodStart: "2026-01-01T00:00:00.000Z",
    periodEnd: "2027-01-01T00:00:00.000Z",
    baseAmount: 36000,
    extraBranchCost: 6000,
    extraUserCost: 2400,
    onboardingFee: 1500,
    referralDiscount: 3000,
    gstPercent: 18,
    gstAmount: 7722,
    totalAmount: 50622,
    amount: 50622,
    currency: "INR",
    paymentStatus: "PAID",
    txnReference: "UPI-REF-9812480129",
    createdAt: "2026-10-25T10:00:00.000Z",
    organizationName: "Apex Auto Detailing Hub",
  };

  it("formats invoice number properly", () => {
    expect(formatInvoiceNumber("SUB-2026-0001")).toBe("INV-2026-0001");
    expect(formatInvoiceNumber("INV-2026-00284")).toBe("INV-2026-00284");
    expect(formatInvoiceNumber("12345")).toBe("INV-12345");
  });

  it("formats currency amounts with commas and 2 decimals", () => {
    expect(formatInvoiceAmount(36000)).toBe("36,000.00");
    expect(formatInvoiceAmount(50622)).toBe("50,622.00");
    expect(formatInvoiceAmount(1000)).toBe("1,000.00");
  });

  it("formats dates in British style 'DD Mon YYYY'", () => {
    expect(formatInvoiceDate("2026-10-25T00:00:00.000Z")).toContain("2026");
    expect(formatInvoiceDate("2026-10-25T00:00:00.000Z")).toContain("Oct");
  });

  it("generates tax invoice HTML matching the admin portal format", () => {
    const html = generateSubscriptionTaxInvoiceHtml(sampleBill);

    // Header
    expect(html).toContain("TAX INVOICE");
    expect(html).toContain("MY DETAIL OS");
    expect(html).toContain("SaaS Auto Detailing Operating System");
    expect(html).toContain("Invoice #: INV-2026-0001");

    // Legal Entity
    expect(html).toContain("BILLED BY (LEGAL ENTITY)");
    expect(html).toContain("Samriddhi Agencies");
    expect(html).toContain("124, Commercial Complex, Sector 14");
    expect(html).toContain("NOIDA, Haryana, 122001");
    expect(html).toContain("GSTIN: 09XXXXXXXXXXXXX");
    expect(html).toContain("PAN: AAAAA0000A");
    expect(html).toContain("State: Haryana (Code 06)");
    expect(html).toContain("billing@mydetailos.com");

    // Billed to workshop
    expect(html).toContain("BILLED TO (WORKSHOP)");
    expect(html).toContain("Apex Auto Detailing Hub");
    expect(html).toContain("Subscription Plan: Pro Plus Workshop");
    expect(html).toContain("Payment Status: PAID");
    expect(html).toContain("Txn Ref: UPI-REF-9812480129");

    // Table line items
    expect(html).toContain("DESCRIPTION");
    expect(html).toContain("AMOUNT (INR)");
    expect(html).toContain("Pro Plus Workshop Base Plan • Yearly (12 months)");
    expect(html).toContain("36,000.00");
    expect(html).toContain("Extra Branch Add-ons");
    expect(html).toContain("6,000.00");
    expect(html).toContain("Extra User Licenses");
    expect(html).toContain("2,400.00");
    expect(html).toContain("One-time Setup &amp; Onboarding");
    expect(html).toContain("1,500.00");
    expect(html).toContain("Partner / Referral Discount");
    expect(html).toContain("-3,000.00");
    expect(html).toContain("GST (18%)");
    expect(html).toContain("7,722.00");

    // Total Payable
    expect(html).toContain("TOTAL PAYABLE (INR)");
    expect(html).toContain("INR 50,622.00");

    // Bank Details
    expect(html).toContain("PAYMENT &amp; BANK TRANSFER DETAILS");
    expect(html).toContain("Beneficiary Name: Samriddhi Agencies");
    expect(html).toContain("Bank: HDFC Bank");
    expect(html).toContain("A/C No: 50200012345678");
    expect(html).toContain("IFSC Code: HDFC0000123");
    expect(html).toContain("Branch: Sector 14, Gurugram");
    expect(html).toContain("UPI ID: samriddhiagencies@hdfcbank");

    // Notes & Terms
    expect(html).toContain("Notes:");
    expect(html).toContain("Terms &amp; Conditions:");
    expect(html).toContain("1. All subscription fees are billed in INR and are non-refundable.");

    // Footer
    expect(html).toContain(
      "Computer generated tax invoice from MY DETAIL OS Admin Portal. Issued by legal entity: Samriddhi Agencies."
    );
  });

  it("generates WhatsApp message with formatted details and invoice link", () => {
    const text = generateSubscriptionInvoiceWhatsAppText(sampleBill);
    expect(text).toContain("Hi *Apex Auto Detailing Hub*, 👋");
    expect(text).toContain("🧾 *Invoice No:* INV-2026-0001");
    expect(text).toContain("📦 *Plan:* Pro Plus Workshop (Yearly (12 months))");
    expect(text).toContain("🟢 *Status:* PAID");
    expect(text).toContain("💳 *Txn Ref:* UPI-REF-9812480129");
    expect(text).toContain("💰 *Base Plan:* ₹36,000.00");
    expect(text).toContain("➕ *Extra Branches:* ₹6,000.00");
    expect(text).toContain("➕ *GST (18%):* ₹7,722.00");
    expect(text).toContain("*Total Paid: ₹50,622.00*");
    expect(text).toContain("📎 *View & Download Tax Invoice:*");
    expect(text).toContain("/subscription-invoice/bill-1");
    expect(text).toContain("— Team MY DETAIL OS");
  });

  it("encodes and decodes subscription invoice for public link", () => {
    const url = buildPublicSubscriptionInvoiceUrl(sampleBill);
    expect(url).toContain("/subscription-invoice/bill-1#data=");

    const hash = url.slice(url.indexOf("#"));
    const decoded = parseSubscriptionInvoiceFromHash(hash);
    expect(decoded).not.toBeNull();
    expect(decoded?.billNumber).toBe("SUB-2026-0001");
    expect(decoded?.organizationName).toBe("Apex Auto Detailing Hub");
    expect(decoded?.planName).toBe("Pro Plus Workshop");
    expect(decoded?.totalAmount).toBe(50622);
  });
});
