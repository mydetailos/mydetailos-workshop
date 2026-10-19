import type { Invoice, ServiceReminder } from "@/types";
import { apiPost, ApiError } from "@/lib/api-client";
import {
  advancePaymentReminderAfterSend,
  markReminderSentForPeriod,
  paymentOutstandingForReminder,
  selectRemindersForAutoWhatsApp,
} from "@/lib/reminder-auto-whatsapp";
import { normalizeReminderKind } from "@/lib/reminder-schedule";
import { invoiceOutstanding } from "@/lib/party/ledger-math";
import {
  buildPaymentPendingReminderWhatsAppMessage,
  buildServiceReminderWhatsAppMessage,
  publicCustomerLedgerShareUrl,
  publicInvoiceShareUrl,
} from "@/lib/whatsapp-customer-messages";
import { sendCustomerWhatsApp, isWhatsAppNotConfiguredError } from "@/lib/whatsapp-send";
import {
  TWILIO_TEMPLATE_SIDS,
  buildServiceReminderVariables,
  buildPaymentPendingVariables,
} from "@/lib/twilio-templates-config";
import { resolveWorkshopDisplayName } from "@/lib/workshop-display-name";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useReminderStore } from "@/store/reminder-store";
import { useInvoiceStore } from "@/store/invoice-store";
import { useSettingsStore } from "@/store/settings-store";
import { useNotificationStore } from "@/store/notification-store";
import { invalidateDomainResources, ensureDomainResources } from "@/lib/domain-data-loader";

export type RunAutoReminderWhatsAppResult = {
  attempted: number;
  sent: number;
  skippedNotConfigured: number;
  failed: number;
  /** Prefer backend job when available */
  viaBackendJob?: boolean;
};

let inFlight: Promise<RunAutoReminderWhatsAppResult> | null = null;

type BackendJobResponse = {
  ok: true;
  summary: {
    organizations: number;
    attempted: number;
    sent: number;
    skippedPaid: number;
    skippedDuplicate: number;
    failed: number;
    advanced: number;
  };
};

/**
 * Prefer secure backend job (`POST /api/jobs/reminders/process`) so cron + UI share one path.
 * Falls back to in-browser Twilio send if the job route is unavailable.
 */
export async function runAutoReminderWhatsAppSends(opts?: {
  reminders?: ServiceReminder[];
  whatsappReminderEnabled?: boolean;
  leadDays?: number;
  businessName?: string;
  invoices?: Invoice[];
  send?: typeof sendCustomerWhatsApp;
  /** Force client-side path (tests). */
  forceClient?: boolean;
}): Promise<RunAutoReminderWhatsAppResult> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const settings = useSettingsStore.getState();
    const enabled = opts?.whatsappReminderEnabled ?? settings.whatsappReminderEnabled;
    if (!enabled) {
      return { attempted: 0, sent: 0, skippedNotConfigured: 0, failed: 0 };
    }

    if (!opts?.forceClient) {
      try {
        const data = await apiPost<BackendJobResponse>("/api/jobs/reminders/process", {});
        const summary = data.summary;
        if (summary.sent > 0) {
          useNotificationStore.getState().addNotification({
            type: "whatsapp_sent",
            title: "Automatic reminders processed",
            message: `${summary.sent} reminder(s) sent via server job`,
            href: "/reminders",
          });
          invalidateDomainResources(["serviceReminders"]);
          await ensureDomainResources(["serviceReminders"]);
        }
        return {
          attempted: summary.attempted,
          sent: summary.sent,
          skippedNotConfigured: 0,
          failed: summary.failed,
          viaBackendJob: true,
        };
      } catch (e) {
        // Job route missing / unauthorized → client fallback for local demos
        if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 401 && e.status !== 503)) {
          // network / 5xx — still try client fallback below
        }
      }
    }

    return runClientSideAutoSends(opts);
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

async function runClientSideAutoSends(opts?: {
  reminders?: ServiceReminder[];
  whatsappReminderEnabled?: boolean;
  leadDays?: number;
  businessName?: string;
  invoices?: Invoice[];
  send?: typeof sendCustomerWhatsApp;
}): Promise<RunAutoReminderWhatsAppResult> {
  const settings = useSettingsStore.getState();
  const enabled = opts?.whatsappReminderEnabled ?? settings.whatsappReminderEnabled;
  const leadDays = opts?.leadDays ?? settings.reminderLeadDays;
  const businessName = opts?.businessName ?? settings.businessName;
  const reminders = opts?.reminders ?? useReminderStore.getState().reminders;
  const invoices = opts?.invoices ?? useInvoiceStore.getState().invoices;
  const send = opts?.send ?? sendCustomerWhatsApp;
  const updateReminder = useReminderStore.getState().updateReminder;

  const invoiceById = new Map(invoices.map((i) => [i.id, i]));
  const getOutstanding = (invoiceId: string) => {
    const inv = invoiceById.get(invoiceId);
    return inv ? invoiceOutstanding(inv) : undefined;
  };

  const candidates = selectRemindersForAutoWhatsApp(reminders, {
    whatsappReminderEnabled: enabled,
    getOutstanding,
  });

  const result: RunAutoReminderWhatsAppResult = {
    attempted: candidates.length,
    sent: 0,
    skippedNotConfigured: 0,
    failed: 0,
    viaBackendJob: false,
  };

  for (const reminder of candidates) {
    const latest =
      useReminderStore.getState().reminders.find((r) => r.id === reminder.id) ?? reminder;
    const stillEligible = selectRemindersForAutoWhatsApp([latest], {
      whatsappReminderEnabled: enabled,
      getOutstanding,
    });
    if (stillEligible.length === 0) continue;

    const workshopName = resolveWorkshopDisplayName({ businessName });
    const isPayment = normalizeReminderKind(latest.kind) === "PAYMENT";
    const amount = paymentOutstandingForReminder(latest, getOutstanding);
    const statementUrl = publicCustomerLedgerShareUrl(latest.customerId);
    const invoiceUrl = latest.invoiceId ? publicInvoiceShareUrl(latest.invoiceId) : undefined;
    const vehicleStr =
      `${latest.vehicleMakeModel || ""} ${latest.vehicleRegNumber ? `(${latest.vehicleRegNumber})` : ""}`.trim() ||
      "Vehicle";
    const dueDateStr = latest.dueDate ? formatDate(latest.dueDate) : "Upcoming";

    const message =
      isPayment
        ? buildPaymentPendingReminderWhatsAppMessage({
            pendingAmount: amount,
            statementUrl,
            businessName: workshopName,
            mode: "singleInvoice",
            invoiceUrl,
            invoiceNumber: latest.invoiceNumber,
          })
        : buildServiceReminderWhatsAppMessage(latest, {
            businessName: workshopName,
          });

    const template = isPayment
      ? (TWILIO_TEMPLATE_SIDS.PAYMENT_PENDING
          ? {
              contentSid: TWILIO_TEMPLATE_SIDS.PAYMENT_PENDING,
              contentVariables: buildPaymentPendingVariables({
                pendingAmount: formatCurrency(amount),
                invoiceNumber: latest.invoiceNumber || latest.invoiceId || "Invoice",
                invoiceUrl: invoiceUrl || statementUrl,
                statementUrl,
                businessName: workshopName,
              }),
            }
          : undefined)
      : (TWILIO_TEMPLATE_SIDS.SERVICE_REMINDER
          ? {
              contentSid: TWILIO_TEMPLATE_SIDS.SERVICE_REMINDER,
              contentVariables: buildServiceReminderVariables({
                customerName: latest.customerName,
                businessName: workshopName,
                reminderType: latest.serviceCategoryName?.trim() || latest.type || "Service",
                vehicleStr,
                dueDate: dueDateStr,
                note: latest.notes?.trim() || "Regular maintenance",
              }),
            }
          : undefined);

    try {
      await send(latest.customerPhone, message, template);
      const sentAt = new Date().toISOString();
      const marked = markReminderSentForPeriod(latest, sentAt);

      if (normalizeReminderKind(latest.kind) === "PAYMENT") {
        const outstanding = paymentOutstandingForReminder(latest, getOutstanding);
        const advanced = advancePaymentReminderAfterSend(marked, {
          leadDays,
          outstanding,
        });
        if (advanced) {
          await updateReminder(latest.id, advanced);
        } else if (outstanding <= 0.01) {
          await updateReminder(latest.id, {
            status: "COMPLETED",
            outstandingAmount: 0,
            whatsappSent: true,
            lastMessageSentAt: sentAt,
          });
        } else {
          await updateReminder(latest.id, {
            whatsappSent: true,
            lastMessageSentAt: sentAt,
            periodKey: marked.periodKey,
          });
        }
      } else {
        await updateReminder(latest.id, {
          whatsappSent: true,
          lastMessageSentAt: sentAt,
          periodKey: marked.periodKey,
        });
      }

      result.sent += 1;
    } catch (e) {
      if (isWhatsAppNotConfiguredError(e)) {
        result.skippedNotConfigured += 1;
        break;
      }
      result.failed += 1;
    }
  }

  return result;
}

export function resetAutoReminderWhatsAppLock(): void {
  inFlight = null;
}
