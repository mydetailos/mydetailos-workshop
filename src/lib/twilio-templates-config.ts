/**
 * TWILIO WHATSAPP CONTENT API CONFIGURATION
 * 
 * Replace the empty strings below with the actual `HX...` template SIDs from your Twilio Console.
 * If you only have one template approved, you can map multiple app events to the same SID,
 * or leave the others empty (which will fall back to the old string-based message format).
 */

export const TWILIO_TEMPLATE_SIDS = {
  // Customer & Portal
  CUSTOMER_WELCOME: "HXa15928c2342c1604e358f8152a79dd45", // cust_welcome_utility_v2 (approved UTILITY)
  AUTH_VERIFICATION: "HXf1c8e1cbd228b0ab0700445712169f1e", // WhatsApp authentication (OTP)

  // Service & Reminders
  BOOKING_CONFIRMED: "HX5cce05db094a51b93ca5341691275165", // booking_confirmed_v2 (UTILITY)
  MEMBERSHIP_WELCOME: "HXc44af52a93227efe07cb3d1707fc71aa", // membership_welcome_v2 (UTILITY)
  JOB_CARD_CREATED: "HXbc4e0ac2bdef379fe6acc1b3a7f128c1", // job_card_created_v3 (approved UTILITY)
  JOB_CARD_READY: "HX67fe4e7fead33acd40e482197767bdf8", // job_card_ready_for_pickup (UTILITY)
  JOB_DELIVERED: "HXf36d3b11526768d4623e917fd9b52b3c", // job_delivered_confirmation (UTILITY)
  SERVICE_REMINDER: "HX7eb233c8252b14bee9403c8eb4bd1fea", // service_reminder_exact
  INSPECTION_REPORT: "HXe3ca0b811651060e2d338d598eef2270", // inspection_report_v2

  // Invoices & Billing
  INVOICE_CREATED: "HX80046e56ada2f400631a63e821f530f9", // invoice_created_collect_car (UTILITY)
  PAYMENT_RECEIVED: "HX8f6f9a652fe4e845e48f3305d3a212d3", // payment_received_invoice_link (UTILITY)
  PAYMENT_PENDING: "HX429538b3d8638a6ef9c0aff78dc0c933", // payment_pending_exact_v2

  // SaaS / Studio Owner
  OWNER_TRIAL_LOGIN: "HX017ae6f1929692e858e682d6ce214cc4", // owner_trial_started_utility (approved UTILITY)
  OWNER_TRIAL_EXPIRING_REMINDER: "HX45af808870cab6c07b1fbee3f5b4f80a", // trial_expiring_reminder_v1 (UTILITY)
  OWNER_TRIAL_EXPIRED: "HX0d17b4d75645d165b231a0d86b32e876", // trial_expired_v1 (UTILITY)
  OWNER_SUBSCRIPTION_EXPIRING_REMINDER: "HX25e04dd54564f85f7a27b1269952d8db", // sub_expiring_reminder_v1 (UTILITY)
  OWNER_SUBSCRIPTION_EXPIRED: "HX54f7800d178682b39fdbfe1e3f329497", // subscription_expired_v1 (UTILITY)
  OWNER_PLAN_ACTIVATED: "HX6614aca21b384ae0eb0089e30eb11981", // owner_plan_activated_exact
  OWNER_PAYMENT_LINK: "HX1bede6b642ec0b693a58bb793bb99558", // owner_payment_link_exact
};

/**
 * Job Card Created (job_card_created_v3: HXbc4e0ac2bdef379fe6acc1b3a7f128c1)
 * Template:
 * "Hi {{1}}! 👋
 *  Your job card has been created at {{2}}. 🚗
 * 
 *  📋 Job: {{3}}
 *  🟢 Status: Received
 *  🚗 Vehicle: {{4}}
 *  🔧 Services: {{5}}
 * 
 *  Track your live status online:
 *  🔗 {{6}}
 * 
 *  Thank you,
 *  {{2}} team."
 */
export function buildJobCardCreatedVariables(opts: {
  customerName: string;
  businessName: string;
  jobNumber: string;
  vehicleStr: string;
  services: string;
  portalUrl: string;
}): Record<string, string> {
  const firstName = opts.customerName.trim().split(/\s+/)[0] || opts.customerName;
  return {
    "1": firstName,
    "2": opts.businessName,
    "3": opts.jobNumber,
    "4": opts.vehicleStr,
    "5": opts.services,
    "6": opts.portalUrl,
  };
}

/**
 * Job Card Ready for Pickup (job_card_ready_for_pickup: HX67fe4e7fead33acd40e482197767bdf8)
 * Template:
 * "Hi {{1}}! 🎉
 *  Your vehicle is ready for pickup from {{2}}. 🚗✨
 * 
 *  📋 Job: {{3}}
 *  🟢 Status: Ready for Pickup
 *  🚗 Vehicle: {{4}}
 *  🔧 Services Completed: {{5}}
 * 
 *  Track your vehicle status & invoice online:
 *  🔗 {{6}}
 * 
 *  Please collect your vehicle at your convenience.
 * 
 *  Thank you,
 *  {{2}} team."
 */
export function buildJobReadyForPickupVariables(opts: {
  customerName: string;
  businessName: string;
  jobNumber: string;
  vehicleStr: string;
  services: string;
  portalUrl: string;
}): Record<string, string> {
  const firstName = opts.customerName.trim().split(/\s+/)[0] || opts.customerName;
  return {
    "1": firstName,
    "2": opts.businessName,
    "3": opts.jobNumber,
    "4": opts.vehicleStr,
    "5": opts.services,
    "6": opts.portalUrl,
  };
}

/**
 * Invoice Created / Collect Car (invoice_created_collect_car: HX80046e56ada2f400631a63e821f530f9)
 * Template:
 * "Hi {{1}}! 🧾
 *  Your invoice has been generated for your vehicle at {{2}}.
 * 
 *  📋 Invoice: {{3}}
 *  🚗 Vehicle: {{4}}
 *  💰 Total Amount: {{5}}
 *  💳 Balance Due: {{6}}
 * 
 *  View your invoice and payment details:
 *  🔗 {{7}}
 * 
 *  Your car is ready. Please collect your vehicle at your convenience.
 * 
 *  Thank you,
 *  {{2}} team."
 */
export function buildInvoiceCreatedVariables(opts: {
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  vehicleStr: string;
  totalAmount: string;
  balanceDue: string;
  portalUrl: string;
}): Record<string, string> {
  const firstName = opts.customerName.trim().split(/\s+/)[0] || opts.customerName;
  return {
    "1": firstName,
    "2": opts.businessName,
    "3": opts.invoiceNumber,
    "4": opts.vehicleStr,
    "5": opts.totalAmount,
    "6": opts.balanceDue,
    "7": opts.portalUrl,
  };
}

/**
 * Payment Received (payment_received_invoice_link: HX8f6f9a652fe4e845e48f3305d3a212d3)
 * Template:
 * "Hi {{1}}! ✅
 *  We have received your payment for {{2}}.
 * 
 *  📋 Invoice: {{3}}
 *  🚗 Vehicle: {{4}}
 *  💰 Amount Paid: {{5}} ({{6}})
 *  💳 Remaining Balance: {{7}}
 * 
 *  View your paid invoice and receipt online:
 *  🔗 {{8}}
 * 
 *  Thank you for your payment!
 * 
 *  Best regards,
 *  {{2}} team."
 */
export function buildPaymentReceivedVariables(opts: {
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  vehicleStr: string;
  amountPaid: string;
  method: string;
  remainingBalance: string;
  portalUrl: string;
}): Record<string, string> {
  const firstName = opts.customerName.trim().split(/\s+/)[0] || opts.customerName;
  return {
    "1": firstName,
    "2": opts.businessName,
    "3": opts.invoiceNumber,
    "4": opts.vehicleStr,
    "5": opts.amountPaid,
    "6": opts.method,
    "7": opts.remainingBalance,
    "8": opts.portalUrl,
  };
}

/**
 * Job Delivered (job_delivered_confirmation: HXf36d3b11526768d4623e917fd9b52b3c)
 * Template:
 * "Hi {{1}}! 🎉
 *  Your vehicle {{3}} has been successfully delivered from {{2}}.
 * 
 *  📋 Job: {{4}}
 *  🟢 Status: Delivered
 * 
 *  Track your service history and invoices anytime:
 *  🔗 {{5}}
 * 
 *  Thank you for choosing {{2}}. We look forward to serving you again!
 * 
 *  Best regards,
 *  {{2}} team."
 */
export function buildJobDeliveredVariables(opts: {
  customerName: string;
  businessName: string;
  vehicleStr: string;
  jobNumber: string;
  portalUrl: string;
}): Record<string, string> {
  const firstName = opts.customerName.trim().split(/\s+/)[0] || opts.customerName;
  return {
    "1": firstName,
    "2": opts.businessName,
    "3": opts.vehicleStr,
    "4": opts.jobNumber,
    "5": opts.portalUrl,
  };
}

/**
 * Customer Welcome (cust_welcome_utility_v2: HXa15928c2342c1604e358f8152a79dd45)
 * Template:
 * "Hi {{1}}!
 *  Welcome to {{2}}. 🚗
 * 
 *  Here are your account details to track your service:
 *  📱 Registered Phone: {{3}}
 *  🔗 Track your vehicle: {{4}}
 * 
 *  Thank you for choosing {{2}} team."
 */
export function buildCustomerWelcomeVariables(
  customerName: string,
  businessName: string,
  phone?: string,
  portalUrl?: string
): Record<string, string> {
  const firstName = customerName.trim().split(/\s+/)[0] || customerName;
  const vars: Record<string, string> = {
    "1": firstName,
    "2": businessName,
  };
  if (phone) vars["3"] = phone.trim();
  if (portalUrl) vars["4"] = portalUrl.trim();
  return vars;
}

/**
 * Service Reminder (service_reminder_exact: HX7eb233c8252b14bee9403c8eb4bd1fea)
 * Template:
 * "Hi {{1}}, Friendly reminder from {{2}} regarding your vehicle.
 *  Reminder: {{3}} | Customer: {{4}} | Vehicle: {{5}} | Due: {{6}} | Note: {{7}}
 *  Book a slot when convenient – reply here or call us. — Team {{2}}"
 */
export function buildServiceReminderVariables(opts: {
  customerName: string;
  businessName: string;
  reminderType: string;
  vehicleStr: string;
  dueDate: string;
  note?: string;
}): Record<string, string> {
  const firstName = opts.customerName.trim().split(/\s+/)[0] || opts.customerName;
  return {
    "1": firstName,
    "2": opts.businessName,
    "3": opts.reminderType,
    "4": opts.customerName,
    "5": opts.vehicleStr,
    "6": opts.dueDate,
    "7": opts.note?.trim() || "Regular maintenance",
  };
}

/**
 * Payment Pending / Ledger Reminder (payment_pending_exact_v2: HX429538b3d8638a6ef9c0aff78dc0c933)
 * Template:
 * "Hi sir/ma'am, Your payment of {{1}} is pending on invoice {{2}}.
 *  View invoice: {{3}} | View full ledger statement: {{4}}
 *  Please clear the payment as soon as possible. Thank you, {{5}} team."
 */
export function buildPaymentPendingVariables(opts: {
  pendingAmount: string;
  invoiceNumber: string;
  invoiceUrl: string;
  statementUrl: string;
  businessName: string;
}): Record<string, string> {
  return {
    "1": opts.pendingAmount,
    "2": opts.invoiceNumber,
    "3": opts.invoiceUrl,
    "4": opts.statementUrl,
    "5": opts.businessName,
  };
}

/**
 * Inspection Report Ready (inspection_report_v2: HXe3ca0b811651060e2d338d598eef2270)
 * Template:
 * "Hello {{2}}, Your vehicle {{3}} inspection report {{4}} is ready at {{5}}.
 *  Diagnostic summary: overall health is {{6}}... Address: {{7}} Need help? Contact us at {{8}}."
 */
export function buildInspectionReportVariables(opts: {
  customerName: string;
  vehicleStr: string;
  reportNumber: string;
  branchName: string;
  overallHealth: string;
  address: string;
  phone: string;
}): Record<string, string> {
  const firstName = opts.customerName.trim().split(/\s+/)[0] || opts.customerName;
  return {
    "2": firstName,
    "3": opts.vehicleStr,
    "4": opts.reportNumber,
    "5": opts.branchName,
    "6": opts.overallHealth,
    "7": opts.address,
    "8": opts.phone,
  };
}

/**
 * Booking Confirmed (booking_confirmed_v2: HX5cce05db094a51b93ca5341691275165)
 * Template:
 * "Hi {{1}}! 👋
 *  Your booking has been confirmed at {{2}}. 🚗
 * 
 *  📋 Booking ID: {{3}}
 *  🚗 Vehicle: {{4}}
 *  🔧 Service: {{5}}
 *  📅 Date & Time: {{6}}
 * 
 *  Thank you for choosing {{2}} team."
 */
export function buildBookingConfirmedVariables(opts: {
  customerName: string;
  businessName: string;
  bookingId: string;
  vehicleStr: string;
  services: string;
  dateTimeStr: string;
  portalUrl?: string;
}): Record<string, string> {
  const firstName = opts.customerName.trim().split(/\s+/)[0] || opts.customerName;
  return {
    "1": firstName,
    "2": opts.businessName,
    "3": opts.bookingId,
    "4": opts.vehicleStr || "Vehicle",
    "5": opts.services || "General Service",
    "6": opts.dateTimeStr || "Scheduled Slot",
  };
}

/**
 * Membership Welcome (membership_welcome_v2: HXc44af52a93227efe07cb3d1707fc71aa)
 * Template:
 * "Hi {{1}}! 🎉
 *  Your {{3}} membership is now active at {{2}}! ⭐
 * 
 *  📅 Plan: {{4}}
 *  ✅ Valid until: {{5}}
 * 
 *  Thank you for choosing {{2}} team."
 */
export function buildMembershipWelcomeVariables(opts: {
  customerName: string;
  businessName: string;
  packageName: string;
  planTier?: string;
  validUntil?: string;
  customerPhone?: string;
  portalUrl?: string;
}): Record<string, string> {
  const firstName = opts.customerName.trim().split(/\s+/)[0] || opts.customerName;
  let validStr = opts.validUntil?.trim() || "1 Year";
  if (opts.validUntil) {
    try {
      const d = new Date(opts.validUntil);
      if (!isNaN(d.getTime())) {
        validStr = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      }
    } catch {
      // keep fallback
    }
  }

  return {
    "1": firstName,
    "2": opts.businessName,
    "3": opts.packageName,
    "4": opts.planTier || "Active",
    "5": validStr,
  };
}

/**
 * Trial Expired (trial_expired_v1: HX0d17b4d75645d165b231a0d86b32e876)
 * Template:
 * "Hi {{1}}! ⚠️
 *  Your free trial for {{2}} on My Detail OS has expired.
 * 
 *  📅 Expiration Date: {{3}}
 *  🔗 Upgrade to an active plan to keep your operations running:
 *  {{4}}
 * 
 *  Thank you,
 *  Team My Detail OS."
 */
export function buildOwnerTrialExpiredVariables(opts: {
  ownerName: string;
  organizationName: string;
  expirationDate: string;
  upgradeUrl: string;
}): Record<string, string> {
  const firstName = opts.ownerName.trim().split(/\s+/)[0] || opts.ownerName;
  return {
    "1": firstName,
    "2": opts.organizationName,
    "3": opts.expirationDate,
    "4": opts.upgradeUrl.replace(/\/$/, ""),
  };
}

/**
 * Subscription Expired (subscription_expired_v1: HX54f7800d178682b39fdbfe1e3f329497)
 * Template:
 * "Hi {{1}}! ⚠️
 *  Your {{3}} subscription for {{2}} on My Detail OS has expired.
 * 
 *  📅 Expiration Date: {{4}}
 *  🔗 Renew your subscription to restore full access:
 *  {{5}}
 * 
 *  Thank you,
 *  Team My Detail OS."
 */
export function buildOwnerSubscriptionExpiredVariables(opts: {
  ownerName: string;
  organizationName: string;
  planName: string;
  expirationDate: string;
  renewalUrl: string;
}): Record<string, string> {
  const firstName = opts.ownerName.trim().split(/\s+/)[0] || opts.ownerName;
  return {
    "1": firstName,
    "2": opts.organizationName,
    "3": opts.planName,
    "4": opts.expirationDate,
    "5": opts.renewalUrl.replace(/\/$/, ""),
  };
}

/**
 * Trial Expiring Reminder (trial_expiring_reminder_v1: HX45af808870cab6c07b1fbee3f5b4f80a)
 * Template:
 * "Hi {{1}}! ⏳
 *  Friendly reminder: your free trial for {{2}} on My Detail OS is expiring in {{3}}.
 * 
 *  📅 Expiration Date: {{4}}
 *  🔗 Upgrade your plan to maintain uninterrupted garage operations:
 *  {{5}}
 * 
 *  Thank you,
 *  Team My Detail OS."
 */
export function buildOwnerTrialExpiringReminderVariables(opts: {
  ownerName: string;
  organizationName: string;
  timeRemaining: string;
  expirationDate: string;
  upgradeUrl: string;
}): Record<string, string> {
  const firstName = opts.ownerName.trim().split(/\s+/)[0] || opts.ownerName;
  return {
    "1": firstName,
    "2": opts.organizationName,
    "3": opts.timeRemaining,
    "4": opts.expirationDate,
    "5": opts.upgradeUrl.replace(/\/$/, ""),
  };
}

/**
 * Subscription Expiring Reminder (sub_expiring_reminder_v1: HX25e04dd54564f85f7a27b1269952d8db)
 * Template:
 * "Hi {{1}}! ⏳
 *  Friendly reminder: your {{3}} subscription for {{2}} on My Detail OS is expiring in {{4}}.
 * 
 *  📅 Expiration Date: {{5}}
 *  🔗 Renew your subscription to maintain uninterrupted service:
 *  {{6}}
 * 
 *  Thank you,
 *  Team My Detail OS."
 */
export function buildOwnerSubscriptionExpiringReminderVariables(opts: {
  ownerName: string;
  organizationName: string;
  planName: string;
  timeRemaining: string;
  expirationDate: string;
  renewalUrl: string;
}): Record<string, string> {
  const firstName = opts.ownerName.trim().split(/\s+/)[0] || opts.ownerName;
  return {
    "1": firstName,
    "2": opts.organizationName,
    "3": opts.planName,
    "4": opts.timeRemaining,
    "5": opts.expirationDate,
    "6": opts.renewalUrl.replace(/\/$/, ""),
  };
}



