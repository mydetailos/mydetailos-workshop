import { TWILIO_TEMPLATE_SIDS } from "./twilio-templates-config";

export interface ParsedTemplateMessage {
  isTemplate: boolean;
  templateName?: string;
  templateSid?: string;
  renderedText: string;
  variables?: Record<string, string>;
}

interface TemplateDefinition {
  name: string;
  template: string;
}

const TEMPLATE_DEFINITIONS: Record<string, TemplateDefinition> = {
  [TWILIO_TEMPLATE_SIDS.JOB_CARD_CREATED]: {
    name: "Job Card Created",
    template: `Hi {{1}}! 👋
Your job card has been created at {{2}}. 🚗

📋 Job: {{3}}
🟢 Status: Received
🚗 Vehicle: {{4}}
🔧 Services: {{5}}

Track your live status online:
🔗 {{6}}

Thank you,
{{2}} team.`,
  },
  [TWILIO_TEMPLATE_SIDS.JOB_CARD_READY]: {
    name: "Ready for Pickup",
    template: `Hi {{1}}! 🎉
Your vehicle is ready for pickup from {{2}}. 🚗✨

📋 Job: {{3}}
🟢 Status: Ready for Pickup
🚗 Vehicle: {{4}}
🔧 Services Completed: {{5}}

Track your vehicle status & invoice online:
🔗 {{6}}

Please collect your vehicle at your convenience.

Thank you,
{{2}} team.`,
  },
  [TWILIO_TEMPLATE_SIDS.JOB_DELIVERED]: {
    name: "Job Delivered",
    template: `Hi {{1}}! 🎉
Your vehicle {{3}} has been successfully delivered from {{2}}. 🚗✨

📋 Job: {{4}}
🟢 Status: Delivered

Track your service history and invoices anytime:
🔗 {{5}}

Thank you for choosing {{2}}. We look forward to serving you again!

Best regards,
{{2}} team.`,
  },
  [TWILIO_TEMPLATE_SIDS.INVOICE_CREATED]: {
    name: "Invoice Generated",
    template: `Hi {{1}}! 🧾
Your invoice has been generated for your vehicle at {{2}}.

📋 Invoice: {{3}}
🚗 Vehicle: {{4}}
💰 Total Amount: {{5}}
💳 Balance Due: {{6}}

View your invoice and payment details:
🔗 {{7}}

Your car is ready. Please collect your vehicle at your convenience.

Thank you,
{{2}} team.`,
  },
  [TWILIO_TEMPLATE_SIDS.PAYMENT_RECEIVED]: {
    name: "Payment Received",
    template: `Hi {{1}}! ✅
We have received your payment for {{2}}.

📋 Invoice: {{3}}
🚗 Vehicle: {{4}}
💰 Amount Paid: {{5}} ({{6}})
💳 Remaining Balance: {{7}}

View your paid invoice and receipt online:
🔗 {{8}}

Thank you for your payment!

Best regards,
{{2}} team.`,
  },
  [TWILIO_TEMPLATE_SIDS.BOOKING_CONFIRMED]: {
    name: "Booking Confirmed",
    template: `Hi {{1}}! 👋
Your booking has been confirmed at {{2}}. 🚗

📋 Booking ID: {{3}}
🚗 Vehicle: {{4}}
🔧 Service: {{5}}
📅 Date & Time: {{6}}

Thank you for choosing {{2}} team.`,
  },
  [TWILIO_TEMPLATE_SIDS.MEMBERSHIP_WELCOME]: {
    name: "Membership Welcome",
    template: `Hi {{1}}! 🎉
Your {{3}} membership is now active at {{2}}! ⭐

📅 Plan: {{4}}
✅ Valid until: {{5}}

Thank you for choosing {{2}} team.`,
  },
  [TWILIO_TEMPLATE_SIDS.CUSTOMER_WELCOME]: {
    name: "Customer Welcome",
    template: `Hi {{1}}!
Welcome to {{2}}. 🚗

Here are your account details to track your service:
📱 Registered Phone: {{3}}
🔗 Track your vehicle: {{4}}

Thank you for choosing {{2}} team.`,
  },
  [TWILIO_TEMPLATE_SIDS.SERVICE_REMINDER]: {
    name: "Service Reminder",
    template: `Hi {{1}}, Friendly reminder from {{2}} regarding your vehicle.
Reminder: {{3}} | Customer: {{4}} | Vehicle: {{5}} | Due: {{6}} | Note: {{7}}
Book a slot when convenient – reply here or call us. — Team {{2}}`,
  },
  [TWILIO_TEMPLATE_SIDS.PAYMENT_PENDING]: {
    name: "Payment Pending",
    template: `Hi sir/ma'am, Your payment of {{1}} is pending on invoice {{2}}.
View invoice: {{3}} | View full ledger statement: {{4}}
Please clear the payment as soon as possible. Thank you, {{5}} team.`,
  },
  [TWILIO_TEMPLATE_SIDS.INSPECTION_REPORT]: {
    name: "Inspection Report",
    template: `Hello {{2}}, Your vehicle {{3}} inspection report {{4}} is ready at {{5}}.
Diagnostic summary: overall health is {{6}}... Address: {{7}} Need help? Contact us at {{8}}`,
  },
  [TWILIO_TEMPLATE_SIDS.OWNER_TRIAL_LOGIN]: {
    name: "Trial Started",
    template: `Welcome {{1}}! Your 14-day trial of My Detail OS for {{2}} is active. Login: {{3}}`,
  },
  [TWILIO_TEMPLATE_SIDS.OWNER_TRIAL_EXPIRING_REMINDER]: {
    name: "Trial Expiring Reminder",
    template: `Hi {{1}}, Your free trial for {{2}} expires in {{3}} days on {{4}}. Upgrade: {{5}}`,
  },
  [TWILIO_TEMPLATE_SIDS.OWNER_TRIAL_EXPIRED]: {
    name: "Trial Expired",
    template: `Hi {{1}}! ⚠️
Your free trial for {{2}} on My Detail OS has expired.

📅 Expiration Date: {{3}}
🔗 Upgrade to an active plan:
{{4}}

Thank you,
Team My Detail OS.`,
  },
  [TWILIO_TEMPLATE_SIDS.OWNER_SUBSCRIPTION_EXPIRING_REMINDER]: {
    name: "Subscription Expiring",
    template: `Hi {{1}}, Your {{3}} subscription for {{2}} expires on {{4}}. Renew: {{5}}`,
  },
  [TWILIO_TEMPLATE_SIDS.OWNER_SUBSCRIPTION_EXPIRED]: {
    name: "Subscription Expired",
    template: `Hi {{1}}! ⚠️
Your {{3}} subscription for {{2}} on My Detail OS has expired.

📅 Expiration Date: {{4}}
🔗 Renew your subscription to restore full access:
{{5}}

Thank you,
Team My Detail OS.`,
  },
};

/**
 * Parses raw logged communication text. If it is a template log entry
 * like `Template: HX... with variables: {...}`, it replaces placeholders
 * with their actual values to render the exact customer-facing message.
 */
export function parseTemplateMessage(body: string): ParsedTemplateMessage {
  if (!body || typeof body !== "string") {
    return { isTemplate: false, renderedText: body || "" };
  }

  // Matches "Template: HX... with variables: {...}"
  const templateRegex = /^Template:\s*([a-zA-Z0-9_-]+)\s*with variables:\s*(\{[\s\S]*\})$/;
  const match = body.trim().match(templateRegex);

  if (!match) {
    return { isTemplate: false, renderedText: body };
  }

  const templateSid = match[1];
  let variables: Record<string, string> = {};

  try {
    variables = JSON.parse(match[2]);
  } catch {
    return {
      isTemplate: true,
      templateSid,
      renderedText: body,
    };
  }

  const def = TEMPLATE_DEFINITIONS[templateSid];

  if (def) {
    let rendered = def.template;
    for (const [key, val] of Object.entries(variables)) {
      rendered = rendered.replaceAll(`{{${key}}}`, val ?? "");
    }
    // Clean up any remaining unresolved {{n}} tokens
    rendered = rendered.replace(/\{\{\d+\}\}/g, "").trim();

    return {
      isTemplate: true,
      templateName: def.name,
      templateSid,
      renderedText: rendered,
      variables,
    };
  }

  // Fallback for unknown / custom template SIDs: format variables nicely
  const varSummary = Object.entries(variables)
    .map(([k, v]) => `• ${k}: ${v}`)
    .join("\n");

  return {
    isTemplate: true,
    templateName: `Template (${templateSid.slice(0, 10)}...)`,
    templateSid,
    renderedText: `Template: ${templateSid}\n\nVariables:\n${varSummary}`,
    variables,
  };
}
