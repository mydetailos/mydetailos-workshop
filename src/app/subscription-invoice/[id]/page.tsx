"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/lib/api-client";
import type { SubscriptionBillRow } from "@/types";
import { formatPaymentStatus } from "@/lib/subscription-export-lock";
import {
  parseSubscriptionInvoiceFromHash,
  formatInvoiceAmount,
  formatInvoiceDate,
  formatInvoiceNumber,
} from "@/lib/subscription-tax-invoice";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Loader2, FileQuestion } from "lucide-react";

export default function PublicSubscriptionInvoicePage() {
  const params = useParams();
  const id = (params?.id as string) || "";

  const [bill, setBill] = useState<(SubscriptionBillRow & { organizationName?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Try decoding bill data from URL hash first (allows zero-auth instantaneous viewing)
    if (typeof window !== "undefined" && window.location.hash) {
      const parsed = parseSubscriptionInvoiceFromHash(window.location.hash);
      if (parsed) {
        setBill(parsed);
        setLoading(false);
        return;
      }
    }

    // 2. Fallback to API if id exists
    if (!id) {
      setLoading(false);
      setError("No invoice ID provided.");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const data = await apiGet<SubscriptionBillRow>(
          `/api/organization/subscription/bills/${encodeURIComponent(id)}`
        );
        if (!cancelled) {
          setBill(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Invoice not found or session expired.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-sm font-medium">Loading Tax Invoice…</p>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <FileQuestion className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Invoice Unavailable</h2>
          <p className="text-sm text-slate-500">
            {error || "Could not retrieve the subscription invoice details."}
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const invoiceNo = formatInvoiceNumber(bill.billNumber);
  const invoiceDate = formatInvoiceDate(bill.createdAt);
  const orgName = bill.organizationName?.trim() || "Workshop";
  const periodStart = formatInvoiceDate(bill.periodStart);
  const periodEnd = formatInvoiceDate(bill.periodEnd);
  const statusLabel = formatPaymentStatus(bill.paymentStatus).toUpperCase();
  const txnRef = bill.txnReference?.trim() || "—";

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

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-12 antialiased">
      {/* Top action header (hidden when printing) */}
      <header className="no-print sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-xs font-mono font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
            {invoiceNo}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-xs"
            onClick={() => window.print()}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </Button>
        </div>
      </header>

      {/* Main Invoice Sheet Container */}
      <main className="max-w-[840px] mx-auto mt-6 sm:mt-8 px-3 sm:px-0">
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-11 print:p-0 print:border-none print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/my-detail-os-mark.png"
                alt="MY DETAIL OS Logo"
                width={48}
                height={48}
                className="w-12 h-12 rounded-xl object-contain border border-slate-200/80 shadow-xs"
              />
              <div>
                <div className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  MY DETAIL OS
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  SaaS Auto Detailing Operating System
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">
                TAX INVOICE
              </div>
              <div className="text-teal-600 font-bold text-xs sm:text-sm mb-0.5">
                Invoice #: {invoiceNo}
              </div>
              <div className="text-slate-500 text-xs">
                Date: {invoiceDate}
              </div>
            </div>
          </div>

          <hr className="border-t border-slate-100 my-6" />

          {/* Two Column Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 mb-7">
            {/* Billed By */}
            <div>
              <div className="text-[11px] font-bold text-sky-600 uppercase tracking-wider mb-1.5">
                BILLED BY (LEGAL ENTITY)
              </div>
              <div className="text-sm font-bold text-slate-900 mb-1">
                Samriddhi Agencies
              </div>
              <div className="text-xs text-slate-600 leading-relaxed space-y-0.5">
                <p>124, Commercial Complex, Sector 14</p>
                <p>NOIDA, Haryana, 122001</p>
                <p>India</p>
                <p>GSTIN: 09XXXXXXXXXXXXX</p>
                <p>PAN: AAAAA0000A</p>
                <p>State: Haryana (Code 06)</p>
                <p>Email: billing@mydetailos.com</p>
              </div>
            </div>

            {/* Billed To */}
            <div>
              <div className="text-[11px] font-bold text-sky-600 uppercase tracking-wider mb-1.5">
                BILLED TO (WORKSHOP)
              </div>
              <div className="text-sm font-bold text-slate-900 mb-1">
                {orgName}
              </div>
              <div className="text-xs text-slate-600 leading-relaxed space-y-0.5">
                <p>Subscription Plan: {bill.planName || "Workshop"}</p>
                <p>Duration: {durationLabel}</p>
                <p>Billing Period: {periodStart} – {periodEnd}</p>
                <p>Payment Status: <span className="font-semibold text-emerald-700">{statusLabel}</span></p>
                <p>Txn Ref: <span className="font-mono text-[11px]">{txnRef}</span></p>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mt-4 mb-6 border border-slate-200/80 rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    DESCRIPTION
                  </th>
                  <th className="text-right px-3.5 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    AMOUNT (INR)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-3.5 py-2.5 text-xs sm:text-sm text-slate-800">
                      {r.desc}
                    </td>
                    <td
                      className={`px-3.5 py-2.5 text-xs sm:text-sm text-right tabular-nums ${
                        r.isNegative ? "text-red-600" : "text-slate-800"
                      }`}
                    >
                      {r.amount}
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-emerald-50/80 border-t-2 border-b-2 border-teal-600">
                  <td className="px-3.5 py-3 text-xs sm:text-sm font-extrabold text-teal-800 uppercase tracking-wide">
                    TOTAL PAYABLE (INR)
                  </td>
                  <td className="px-3.5 py-3 text-xs sm:text-sm font-extrabold text-teal-800 text-right tabular-nums">
                    INR {formatInvoiceAmount(totalAmt)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bank Transfer Details Box */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 mb-5">
            <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wider mb-1.5">
              PAYMENT &amp; BANK TRANSFER DETAILS
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              <p>Beneficiary Name: <span className="font-semibold text-slate-800">Samriddhi Agencies</span></p>
              <p>Bank: HDFC Bank &nbsp;|&nbsp; A/C No: <span className="font-mono font-medium">50200012345678</span></p>
              <p>IFSC Code: <span className="font-mono font-medium">HDFC0000123</span> &nbsp;|&nbsp; Branch: Sector 14, Gurugram &nbsp;|&nbsp; UPI ID: <span className="font-mono">samriddhiagencies@hdfcbank</span></p>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="text-xs text-slate-500 leading-relaxed mb-8 space-y-2">
            <p>
              <strong className="text-slate-700">Notes:</strong> Thank you for choosing MY DETAIL OS. For invoice or billing inquiries, reach out to billing@mydetailos.com.
            </p>
            <div>
              <strong className="text-slate-700">Terms &amp; Conditions:</strong>
              <ol className="list-decimal list-inside space-y-0.5 mt-0.5">
                <li>All subscription fees are billed in INR and are non-refundable.</li>
                <li>This is a computer-generated tax invoice and requires no physical signature.</li>
                <li>Goods &amp; Services Tax (GST) is charged as per applicable Indian tax laws.</li>
                <li>Disputes, if any, shall be subject to Gurugram, Haryana jurisdiction.</li>
              </ol>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
            Computer generated tax invoice from MY DETAIL OS Admin Portal. Issued by legal entity: Samriddhi Agencies.
          </div>
        </div>
      </main>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            padding: 0 !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm 14mm;
          }
        }
      `}</style>
    </div>
  );
}
