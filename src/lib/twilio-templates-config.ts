/**
 * TWILIO WHATSAPP CONTENT API CONFIGURATION
 * 
 * Replace the empty strings below with the actual `HX...` template SIDs from your Twilio Console.
 * If you only have one template approved, you can map multiple app events to the same SID,
 * or leave the others empty (which will fall back to the old string-based message format).
 */

export const TWILIO_TEMPLATE_SIDS = {
  // Customer & Portal
  CUSTOMER_WELCOME: "HXc25b2ea428f2a532f4356c73ff02e76c", // customer_welcome_utility (approved UTILITY)
  AUTH_VERIFICATION: "HXf1c8e1cbd228b0ab0700445712169f1e", // WhatsApp authentication (OTP)

  // Service & Reminders
  JOB_CARD_CREATED: "HXbc4e0ac2bdef379fe6acc1b3a7f128c1", // job_card_created_v3 (UTILITY)
  SERVICE_REMINDER: "HX7eb233c8252b14bee9403c8eb4bd1fea", // service_reminder_exact
  INSPECTION_REPORT: "HXe3ca0b811651060e2d338d598eef2270", // inspection_report_v2

  // Invoices & Billing
  PAYMENT_PENDING: "HX429538b3d8638a6ef9c0aff78dc0c933", // payment_pending_exact_v2

  // SaaS / Studio Owner
  OWNER_TRIAL_LOGIN: "HX017ae6f1929692e858e682d6ce214cc4", // owner_trial_started_utility (approved UTILITY)
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
 * Customer Welcome (customer_welcome_utility: HXc25b2ea428f2a532f4356c73ff02e76c)
 * Template: "Hi {{1}}, your customer account for {{2}} is now active..."
 */
export function buildCustomerWelcomeVariables(
  customerName: string,
  businessName: string
): Record<string, string> {
  const firstName = customerName.trim().split(/\s+/)[0] || customerName;
  return {
    "1": firstName,
    "2": businessName,
  };
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
