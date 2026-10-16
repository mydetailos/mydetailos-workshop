import { toast } from "sonner";
import type { Invoice, PaymentMethod } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { buildInvoicePaymentReceivedWhatsAppMessage } from "@/lib/whatsapp-customer-messages";
import {
  sendCustomerWhatsApp,
  openWhatsAppComposer,
  isWhatsAppNotConfiguredError,
} from "@/lib/whatsapp-send";
import { ApiError } from "@/lib/api-client";
import { useNotificationStore } from "@/store/notification-store";
import { useJobCardStore } from "@/store/job-card-store";
import { pushActivityLog } from "@/lib/activity-log-helper";
import { getCustomerPortalLoginUrl } from "@/lib/customer-portal-url";
import { resolveWorkshopDisplayName } from "@/lib/workshop-display-name";
import {
  TWILIO_TEMPLATE_SIDS,
  buildPaymentReceivedVariables,
} from "@/lib/twilio-templates-config";

/**
 * Sends a WhatsApp payment confirmation after `recordPayment` succeeds.
 * Skips silently when `invoice.customerPhone` is missing.
 */
export async function notifyCustomerPaymentRecordedWhatsApp(params: {
  invoice: Invoice;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  paidAt: string;
  remainingBalanceAfter: number;
  businessName: string;
}): Promise<void> {
  const phone = params.invoice.customerPhone?.trim();
  if (!phone) return;

  const workshopName = resolveWorkshopDisplayName({ businessName: params.businessName });
  const portalUrl = getCustomerPortalLoginUrl();

  const message = buildInvoicePaymentReceivedWhatsAppMessage(
    params.invoice,
    {
      amount: params.amount,
      method: params.method,
      referenceNumber: params.referenceNumber,
      paidAt: params.paidAt,
    },
    params.remainingBalanceAfter,
    { businessName: workshopName }
  );

  const vehicleStr = params.invoice.vehicleRegNumber || "Vehicle";
  const template = TWILIO_TEMPLATE_SIDS.PAYMENT_RECEIVED
    ? {
        contentSid: TWILIO_TEMPLATE_SIDS.PAYMENT_RECEIVED,
        contentVariables: buildPaymentReceivedVariables({
          customerName: params.invoice.customerName,
          businessName: workshopName,
          invoiceNumber: params.invoice.invoiceNumber,
          vehicleStr,
          amountPaid: formatCurrency(params.amount),
          method: params.method,
          remainingBalance: formatCurrency(Math.max(0, params.remainingBalanceAfter)),
          portalUrl,
        }),
      }
    : undefined;

  const billingHref = `/billing/${params.invoice.id}`;
  const branchId = useJobCardStore
    .getState()
    .jobCards.find((j) => j.id === params.invoice.jobCardId)?.branchId;
  const notify = (channel: "api" | "composer") => {
    useNotificationStore.getState().addNotification({
      type: "whatsapp_sent",
      title:
        channel === "api"
          ? "Payment confirmation via WhatsApp"
          : "Payment — WhatsApp composer",
      message: `${params.invoice.invoiceNumber} → ${phone}`,
      href: billingHref,
      branchId,
    });
  };

  const logPaymentWa = (detailsSuffix: string) => {
    pushActivityLog({
      action: "WHATSAPP_SENT",
      entityType: "INVOICE",
      entityId: params.invoice.id,
      entityLabel: params.invoice.invoiceNumber,
      details: `Payment ${formatCurrency(params.amount)} — ${detailsSuffix}`,
    });
  };

  try {
    await sendCustomerWhatsApp(phone, message, template);
    notify("api");
    logPaymentWa(`payment confirmation sent via WhatsApp to ${params.invoice.customerName}`);
  } catch (err) {
    if (isWhatsAppNotConfiguredError(err)) {
      openWhatsAppComposer(phone, message);
      notify("composer");
      logPaymentWa(
        `payment WhatsApp composer opened (${phone}); Twilio WhatsApp not configured on server`
      );
      toast.info("Payment recorded — WhatsApp opened", {
        description:
          "Server WhatsApp is not configured. Finish sending the confirmation in the WhatsApp app.",
      });
      return;
    }
    const desc =
      err instanceof ApiError ? err.message : "Could not send WhatsApp confirmation.";
    toast.error("Payment WhatsApp failed", { description: desc });
  }
}
