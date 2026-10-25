import type { SubscriptionBillRow } from "@/types";
import { formatPaymentStatus } from "@/lib/subscription-export-lock";
import { toast } from "sonner";

/**
 * Format date like "25 Oct 2026" or "01 Jan 2026" as shown on the tax invoice.
 */
export function formatInvoiceDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format currency amount with comma grouping and 2 decimal places (e.g. 36,000.00).
 */
export function formatInvoiceAmount(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "0.00";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats bill number into standard tax invoice number (e.g. "INV-2026-0001" or "INV-2026-00284").
 */
export function formatInvoiceNumber(billNumber: string | null | undefined): string {
  if (!billNumber) return "INV-2026-0001";
  if (billNumber.startsWith("INV-")) return billNumber;
  if (billNumber.startsWith("SUB-")) return billNumber.replace(/^SUB-/, "INV-");
  return `INV-${billNumber}`;
}

function escapeHtml(s: string | number | null | undefined): string {
  const text = s == null ? "" : String(s);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateSubscriptionTaxInvoiceHtml(
  bill: SubscriptionBillRow & { organizationName?: string }
): string {
  const invoiceNo = escapeHtml(formatInvoiceNumber(bill.billNumber));
  const invoiceDate = escapeHtml(formatInvoiceDate(bill.createdAt));
  const orgName = escapeHtml(bill.organizationName?.trim() || "Workshop");
  const periodStart = escapeHtml(formatInvoiceDate(bill.periodStart));
  const periodEnd = escapeHtml(formatInvoiceDate(bill.periodEnd));
  const statusLabel = escapeHtml(formatPaymentStatus(bill.paymentStatus).toUpperCase());
  const txnRef = escapeHtml(bill.txnReference?.trim() || "—");

  const baseAmt =
    bill.baseAmount != null
      ? bill.baseAmount
      : (bill.totalAmount ?? bill.amount ?? 0) - (bill.gstAmount ?? 0);
  const totalAmt = bill.totalAmount ?? bill.amount ?? 0;
  const gstRate = bill.gstPercent ?? 18;
  const gstAmt = bill.gstAmount ?? 0;

  const durationLabel = `${bill.termLabel || "Yearly"} (${bill.termMonths || 12} months)`;
  const planBaseDescription = `${bill.planName || "Workshop"} Base Plan • ${durationLabel}`;

  const rows: { desc: string; amount: string; isNegative?: boolean }[] = [
    {
      desc: planBaseDescription,
      amount: formatInvoiceAmount(baseAmt),
    },
  ];

  if (bill.extraBranchCost && bill.extraBranchCost > 0) {
    rows.push({
      desc: "Extra Branch Add-ons",
      amount: formatInvoiceAmount(bill.extraBranchCost),
    });
  }

  if (bill.extraUserCost && bill.extraUserCost > 0) {
    rows.push({
      desc: "Extra User Licenses",
      amount: formatInvoiceAmount(bill.extraUserCost),
    });
  }

  if (bill.onboardingFee && bill.onboardingFee > 0) {
    rows.push({
      desc: "One-time Setup & Onboarding",
      amount: formatInvoiceAmount(bill.onboardingFee),
    });
  }

  if (bill.referralDiscount && bill.referralDiscount > 0) {
    rows.push({
      desc: "Partner / Referral Discount",
      amount: `-${formatInvoiceAmount(bill.referralDiscount)}`,
      isNegative: true,
    });
  }

  rows.push({
    desc: `GST (${gstRate}%)`,
    amount: formatInvoiceAmount(gstAmt),
  });

  const tableRowsHtml = rows
    .map(
      (r) => `
    <tr>
      <td style="padding: 10px 14px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${escapeHtml(r.desc)}</td>
      <td style="padding: 10px 14px; font-size: 13px; color: ${r.isNegative ? "#dc2626" : "#1e293b"}; border-bottom: 1px solid #f1f5f9; text-align: right; font-variant-numeric: tabular-nums;">${r.amount}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${invoiceNo} - Tax Invoice</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 36px 44px;
      font-size: 13px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 14mm 16mm;
      }
      body {
        padding: 0 !important;
        background: #ffffff !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <img src="/my-detail-os-mark.png" alt="MY DETAIL OS Logo" style="width: 44px; height: 44px; border-radius: 8px; object-fit: contain; border: 1px solid #e2e8f0;" />
      <div>
        <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; line-height: 1.1;">
          MY DETAIL OS
        </div>
        <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-top: 2px;">
          SaaS Auto Detailing Operating System
        </div>
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; line-height: 1; margin-bottom: 5px;">
        TAX INVOICE
      </div>
      <div style="color: #0d9488; font-weight: 700; font-size: 13px; margin-bottom: 3px;">
        Invoice #: ${invoiceNo}
      </div>
      <div style="color: #64748b; font-size: 12px;">
        Date: ${invoiceDate}
      </div>
    </div>
  </div>

  <hr style="border: none; border-top: 1px solid #f1f5f9; margin-bottom: 24px;" />

  <!-- Two Column Parties -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 28px;">
    <!-- Billed By -->
    <div>
      <div style="font-size: 11px; font-weight: 700; color: #0284c7; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 6px;">
        BILLED BY (LEGAL ENTITY)
      </div>
      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
        Samriddhi Agencies
      </div>
      <div style="font-size: 12px; color: #334155; line-height: 1.55;">
        124, Commercial Complex, Sector 14<br />
        NOIDA, Haryana, 122001<br />
        India<br />
        GSTIN: 09XXXXXXXXXXXXX<br />
        PAN: AAAAA0000A<br />
        State: Haryana (Code 06)<br />
        Email: billing@mydetailos.com
      </div>
    </div>

    <!-- Billed To -->
    <div>
      <div style="font-size: 11px; font-weight: 700; color: #0284c7; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 6px;">
        BILLED TO (WORKSHOP)
      </div>
      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
        ${orgName}
      </div>
      <div style="font-size: 12px; color: #334155; line-height: 1.55;">
        Subscription Plan: ${bill.planName || "Workshop"}<br />
        Duration: ${durationLabel}<br />
        Billing Period: ${periodStart} – ${periodEnd}<br />
        Payment Status: ${statusLabel}<br />
        Txn Ref: ${txnRef}
      </div>
    </div>
  </div>

  <!-- Table -->
  <table style="width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 24px;">
    <thead>
      <tr style="background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        <th style="text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #475569; letter-spacing: 0.05em; text-transform: uppercase;">
          DESCRIPTION
        </th>
        <th style="text-align: right; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #475569; letter-spacing: 0.05em; text-transform: uppercase;">
          AMOUNT (INR)
        </th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
      <!-- Total Banner Row -->
      <tr style="background: #ecfdf5; border-top: 1.5px solid #0d9488; border-bottom: 1.5px solid #0d9488;">
        <td style="padding: 12px 14px; font-size: 12px; font-weight: 800; color: #0f766e; letter-spacing: 0.05em; text-transform: uppercase;">
          TOTAL PAYABLE (INR)
        </td>
        <td style="padding: 12px 14px; font-size: 13px; font-weight: 800; color: #0f766e; text-align: right; font-variant-numeric: tabular-nums;">
          INR ${formatInvoiceAmount(totalAmt)}
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Bank Details Box -->
  <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; background: #f8fafc; margin-bottom: 18px;">
    <div style="font-size: 11px; font-weight: 700; color: #0d9488; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 6px;">
      PAYMENT &amp; BANK TRANSFER DETAILS
    </div>
    <div style="font-size: 11px; color: #334155; line-height: 1.6;">
      Beneficiary Name: Samriddhi Agencies<br />
      Bank: HDFC Bank &nbsp;|&nbsp; A/C No: 50200012345678<br />
      IFSC Code: HDFC0000123 &nbsp;|&nbsp; Branch: Sector 14, Gurugram &nbsp;|&nbsp; UPI ID: samriddhiagencies@hdfcbank
    </div>
  </div>

  <!-- Notes & Terms -->
  <div style="font-size: 11px; color: #475569; line-height: 1.55; margin-bottom: 32px;">
    <div style="margin-bottom: 6px;">
      <strong style="color: #1e293b;">Notes:</strong> Thank you for choosing MY DETAIL OS. For invoice or billing inquiries, reach out to billing@mydetailos.com.
    </div>
    <div>
      <strong style="color: #1e293b;">Terms &amp; Conditions:</strong><br />
      1. All subscription fees are billed in INR and are non-refundable.<br />
      2. This is a computer-generated tax invoice and requires no physical signature.<br />
      3. Goods &amp; Services Tax (GST) is charged as per applicable Indian tax laws.<br />
      4. Disputes, if any, shall be subject to Gurugram, Haryana jurisdiction.
    </div>
  </div>

  <!-- Footer -->
  <div style="padding-top: 14px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8;">
    Computer generated tax invoice from MY DETAIL OS Admin Portal. Issued by legal entity: Samriddhi Agencies.
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;
}

/**
 * Open print window for the subscription Tax Invoice
 */
export function openSubscriptionTaxInvoicePrint(
  bill: SubscriptionBillRow & { organizationName?: string }
): void {
  const html = generateSubscriptionTaxInvoiceHtml(bill);
  const w = window.open("", "_blank");
  if (!w) {
    toast.error("Allow pop-ups to download the invoice");
    return;
  }
  w.document.write(html);
  w.document.close();
}

/**
 * Build shareable public URL for subscription tax invoice.
 */
export function buildPublicSubscriptionInvoiceUrl(
  bill: SubscriptionBillRow & { organizationName?: string }
): string {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";

  const compact = {
    id: bill.id,
    bn: bill.billNumber,
    on: bill.organizationName,
    pn: bill.planName,
    tm: bill.termMonths,
    tl: bill.termLabel,
    ps: bill.periodStart,
    pe: bill.periodEnd,
    ba: bill.baseAmount,
    eb: bill.extraBranchCost,
    eu: bill.extraUserCost,
    ob: bill.onboardingFee,
    rd: bill.referralDiscount,
    gp: bill.gstPercent,
    ga: bill.gstAmount,
    ta: bill.totalAmount,
    am: bill.amount,
    cu: bill.currency,
    st: bill.paymentStatus,
    tr: bill.txnReference,
    ca: bill.createdAt,
  };

  try {
    const raw = JSON.stringify(compact);
    const encoded =
      typeof btoa !== "undefined"
        ? btoa(
            encodeURIComponent(raw).replace(/%([0-9A-F]{2})/g, (_, p1) =>
              String.fromCharCode(parseInt(p1, 16))
            )
          )
        : Buffer.from(raw).toString("base64");
    return `${origin}/subscription-invoice/${encodeURIComponent(bill.id)}#data=${encoded}`;
  } catch {
    return `${origin}/subscription-invoice/${encodeURIComponent(bill.id)}`;
  }
}

/**
 * Parse subscription bill row from URL hash data param.
 */
export function parseSubscriptionInvoiceFromHash(
  hash: string
): (SubscriptionBillRow & { organizationName?: string }) | null {
  try {
    const match = hash.match(/[#&]data=([^&]+)/);
    if (!match || !match[1]) return null;
    const rawB64 = match[1];
    const decodedStr =
      typeof atob !== "undefined"
        ? decodeURIComponent(
            Array.prototype.map
              .call(atob(rawB64), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          )
        : Buffer.from(rawB64, "base64").toString("utf-8");
    const c = JSON.parse(decodedStr);
    return {
      id: c.id || "sub-invoice",
      billNumber: c.bn || "INV-2026-0001",
      organizationName: c.on || "Workshop",
      planName: c.pn || "Workshop Plan",
      termMonths: c.tm || 12,
      termLabel: c.tl || "Yearly",
      periodStart: c.ps || "",
      periodEnd: c.pe || "",
      baseAmount: c.ba,
      extraBranchCost: c.eb || 0,
      extraUserCost: c.eu || 0,
      onboardingFee: c.ob || 0,
      referralDiscount: c.rd || 0,
      gstPercent: c.gp ?? 18,
      gstAmount: c.ga || 0,
      totalAmount: c.ta ?? c.am ?? 0,
      amount: c.am ?? c.ta ?? 0,
      currency: c.cu || "INR",
      paymentStatus: c.st || "PAID",
      txnReference: c.tr || null,
      createdAt: c.ca || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Generate formatted WhatsApp message text for subscription invoice with view link.
 */
export function generateSubscriptionInvoiceWhatsAppText(
  bill: SubscriptionBillRow & { organizationName?: string }
): string {
  const invoiceNo = formatInvoiceNumber(bill.billNumber);
  const invoiceDate = formatInvoiceDate(bill.createdAt);
  const orgName = bill.organizationName?.trim() || "Workshop";
  const periodStart = formatInvoiceDate(bill.periodStart);
  const periodEnd = formatInvoiceDate(bill.periodEnd);
  const durationLabel = `${bill.termLabel || "Yearly"} (${bill.termMonths || 12} months)`;
  const totalAmt = bill.totalAmount ?? bill.amount ?? 0;
  const baseAmt =
    bill.baseAmount != null
      ? bill.baseAmount
      : totalAmt - (bill.gstAmount ?? 0);
  const invoiceUrl = buildPublicSubscriptionInvoiceUrl(bill);

  const lines = [
    `Hi *${orgName}*, 👋`,
    "",
    `Here is your subscription tax invoice from *MY DETAIL OS*. 📄`,
    "",
    `🧾 *Invoice No:* ${invoiceNo}`,
    `📅 *Date:* ${invoiceDate}`,
    `📦 *Plan:* ${bill.planName || "Workshop"} (${durationLabel})`,
    `🗓️ *Billing Period:* ${periodStart} – ${periodEnd}`,
    `🟢 *Status:* ${formatPaymentStatus(bill.paymentStatus).toUpperCase()}`,
  ];

  if (bill.txnReference?.trim()) {
    lines.push(`💳 *Txn Ref:* ${bill.txnReference.trim()}`);
  }

  lines.push("");
  lines.push(`💰 *Base Plan:* ₹${formatInvoiceAmount(baseAmt)}`);

  if (bill.extraBranchCost && bill.extraBranchCost > 0) {
    lines.push(`➕ *Extra Branches:* ₹${formatInvoiceAmount(bill.extraBranchCost)}`);
  }
  if (bill.extraUserCost && bill.extraUserCost > 0) {
    lines.push(`➕ *Extra Users:* ₹${formatInvoiceAmount(bill.extraUserCost)}`);
  }
  if (bill.onboardingFee && bill.onboardingFee > 0) {
    lines.push(`➕ *Onboarding Fee:* ₹${formatInvoiceAmount(bill.onboardingFee)}`);
  }
  if (bill.referralDiscount && bill.referralDiscount > 0) {
    lines.push(`➖ *Referral Discount:* -₹${formatInvoiceAmount(bill.referralDiscount)}`);
  }
  if (bill.gstAmount && bill.gstAmount > 0) {
    lines.push(`➕ *GST (${bill.gstPercent ?? 18}%):* ₹${formatInvoiceAmount(bill.gstAmount)}`);
  }

  lines.push("");
  lines.push(`*Total Paid: ₹${formatInvoiceAmount(totalAmt)}*`);
  lines.push("");
  lines.push(`📎 *View & Download Tax Invoice:*`);
  lines.push(invoiceUrl);
  lines.push("");
  lines.push("Thank you for choosing MY DETAIL OS!");
  lines.push("— Team MY DETAIL OS");

  return lines.join("\n");
}

/**
 * Open WhatsApp Web/App with subscription invoice details and link prefilled.
 */
export function openSubscriptionInvoiceWhatsApp(
  bill: SubscriptionBillRow & { organizationName?: string; phone?: string | null }
): void {
  const text = generateSubscriptionInvoiceWhatsAppText(bill);
  const raw = (bill.phone || "").replace(/\D/g, "");
  const waDigits = raw.length === 10 ? `91${raw}` : raw;
  const waUrl = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(waUrl, "_blank", "noopener,noreferrer");
}
