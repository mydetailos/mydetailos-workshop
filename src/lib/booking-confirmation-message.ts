import { format, parseISO } from "date-fns";
import type { Appointment, JobCard } from "@/types";

function buildTermsLine(termsUrl?: string): string {
  const base =
    "(a) A GST invoice will be provided digitally. (b) Services are subject to vehicle inspection and feasibility. (c) Advance payments, if collected, are adjusted against the final invoice.";
  if (termsUrl?.trim()) {
    return `${base} For full terms and disclaimers, please visit: ${termsUrl.trim()}`;
  }
  return base;
}

function formatRs(amount: number): string {
  return `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
}

function formatInrPlain(amount: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

function firstName(apt: Appointment): string {
  if (apt.customerFirstName?.trim()) return apt.customerFirstName.trim();
  return apt.customerName.split(/\s+/)[0] ?? apt.customerName;
}

function greetingName(apt: Appointment): string {
  return firstName(apt);
}

/** Vehicle line for booking details — make/model (COLOUR), registration omitted when colour is set. */
export function appointmentVehicleDisplayLine(apt: Appointment): string {
  const makeModel = apt.vehicleMakeModel.trim();
  const colour = apt.vehicleColor?.trim();
  const reg = apt.vehicleRegNumber.trim();
  if (colour) {
    return `${makeModel} (${colour.toUpperCase()})`;
  }
  return reg ? `${makeModel} (${reg})` : makeModel;
}

function bookingDetailsLine(apt: Appointment): string {
  const parts = [
    appointmentVehicleDisplayLine(apt),
    apt.serviceType?.trim(),
    apt.bookingPricingLine?.trim(),
  ].filter((x): x is string => Boolean(x && x.length > 0));
  if (parts.length > 0) return parts.join(" · ");
  return "Pricing and package details will be confirmed at the workshop.";
}

function bookingDateLine(apt: Appointment): string {
  const d = parseISO(apt.date);
  return format(d, "EEE, dd-MMM-yyyy");
}

function expectedDeliveryFormatted(apt: Appointment): string {
  if (apt.expectedDeliveryDate) {
    const ed = parseISO(apt.expectedDeliveryDate);
    return format(ed, "EEE, dd-MMM-yyyy");
  }
  return "— (to be confirmed)";
}

function bookingScheduleBlock(apt: Appointment): string {
  const delivery = expectedDeliveryFormatted(apt);
  const note = apt.deliveryExpectationNote?.trim();
  return note
    ? `*${bookingDateLine(apt)}* | Expected Delivery: ${delivery} (${note})`
    : `*${bookingDateLine(apt)}* | Expected Delivery: ${delivery}`;
}

function priceDetailsBlock(apt: Appointment): string {
  const advanceNote = apt.advancePolicyNote?.trim();

  if (
    apt.priceSubtotalExGst != null &&
    apt.priceGstAmount != null &&
    apt.priceGrandTotal != null
  ) {
    const priceLine =
      apt.priceGstAmount > 0
        ? `${formatRs(apt.priceSubtotalExGst)} + ${formatInrPlain(apt.priceGstAmount)} (GST) = ${formatInrPlain(apt.priceGrandTotal)}`
        : `${formatRs(apt.priceGrandTotal)}`;
    return [
      `*PRICE DETAILS:*`,
      priceLine,
      apt.advancePaid != null ? `Advance: ${formatRs(apt.advancePaid)}` : "",
      advanceNote ? `Note: ${advanceNote}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `*PRICE DETAILS:*`,
    `Pricing will be confirmed at the workshop before work begins.`,
    apt.advancePaid != null ? `Advance: ${formatRs(apt.advancePaid)}` : "",
    advanceNote ? `Note: ${advanceNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function regardsTeamLine(business: BookingConfirmationBusiness): string {
  const name = business.businessName?.trim() || business.branchName || "Our team";
  return name.toLowerCase().startsWith("team ") ? name : `Team ${name}`;
}

function outletAtLine(business: BookingConfirmationBusiness): string {
  return (business.acceptanceOutlet ?? business.studioName ?? "Workshop").trim();
}

export type BookingConfirmationBusiness = {
  /** Label after @ in opening line (e.g. "Workshop"). */
  acceptanceOutlet?: string;
  /** Branch / studio label. */
  branchName: string;
  /** Business / studio name for Regards block. */
  businessName?: string;
  /** @deprecated Use acceptanceOutlet */
  studioName?: string;
  address: string;
  phone: string;
  email: string;
  /** Full terms URL */
  termsUrl?: string;
};

/** Build business footer block from app settings + optional branch label. */
export function getBookingConfirmationBusiness(opts: {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessWebsite?: string;
  branchLabel?: string;
  acceptanceOutlet?: string;
}): BookingConfirmationBusiness {
  let termsUrl: string | undefined;
  const w = opts.businessWebsite?.trim();
  if (w) {
    const base = /^https?:\/\//i.test(w) ? w : `https://${w}`;
    const normalized = base.replace(/\/$/, "");
    termsUrl = /terms/i.test(normalized) ? normalized : `${normalized}/terms-conditions`;
  }
  return {
    acceptanceOutlet: opts.acceptanceOutlet ?? opts.branchLabel ?? "Workshop",
    branchName: opts.branchLabel?.trim() || opts.businessName || "Workshop",
    businessName: opts.businessName,
    address: opts.businessAddress,
    phone: opts.businessPhone,
    email: opts.businessEmail,
    termsUrl,
  };
}

export function buildBookingConfirmationMessage(
  apt: Appointment,
  business: BookingConfirmationBusiness
): string {
  const name = greetingName(apt);
  const brand = business.businessName?.trim() || business.branchName?.trim() || "our workshop";
  const wa = (apt.whatsappPhone ?? apt.customerPhone).trim();
  const mobile = apt.customerPhone.trim();
  const terms = buildTermsLine(business.termsUrl);
  const team = regardsTeamLine(business);

  return [
    `Hi *${name}*! 👋`,
    ``,
    `Your booking request *(No: ${apt.bookingId})* has been successfully confirmed at *${brand}*. 🚗`,
    ``,
    `*BOOKING DETAILS:*`,
    bookingDetailsLine(apt),
    ``,
    priceDetailsBlock(apt),
    ``,
    `*BOOKING DATE & TIME:*`,
    bookingScheduleBlock(apt),
    `Kindly visit our workshop 15-30 minutes before your slot to facilitate vehicle intake.`,
    ``,
    `*CUSTOMER DETAILS:*`,
    `Name: ${apt.customerName}`,
    `Mobile No: ${mobile}${wa && wa !== mobile ? ` | WhatsApp: ${wa}` : ""}`,
    apt.customerAddress ? `Address: ${apt.customerAddress}` : "",
    ``,
    `*PLEASE NOTE:*`,
    `Please remove all personal valuables before handing over your vehicle. Our team will perform an initial vehicle inspection with you before starting work.`,
    ``,
    `*TERMS & CONDITIONS:*`,
    terms,
    ``,
    `Regards,`,
    team,
    business.address ? business.address : "",
    business.phone ? `Phone: ${business.phone}` : "",
    business.email ? `Email: ${business.email}` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/**
 * WhatsApp body — full booking confirmation template (split into ≤1600-char parts at send time).
 */
export function buildBookingWhatsAppMessageCompact(
  apt: Appointment,
  business: BookingConfirmationBusiness
): string {
  return buildBookingConfirmationMessage(apt, business);
}

export type JobCardCreationConfirmationInput = {
  job: JobCard;
  business: BookingConfirmationBusiness;
  customerAddress?: string;
  vehicleColor?: string;
  priceSubtotalExGst: number;
  priceGstAmount: number;
  priceGrandTotal: number;
  advancePaid?: number;
  /** yyyy-MM-dd — visit / job intake date */
  appointmentDate: string;
  /** HH:mm */
  appointmentTime: string;
  bookingPricingLine?: string;
};

/** Full confirmation message when a job card is created (same template as bookings). */
export function buildJobCardCreationConfirmationMessage(
  input: JobCardCreationConfirmationInput
): string {
  const { job } = input;
  const serviceType =
    job.services
      .map((s) => s.name)
      .filter(Boolean)
      .join(" + ") || "Service";
  const expectedDeliveryDate =
    job.expectedDelivery && !Number.isNaN(Date.parse(job.expectedDelivery))
      ? format(parseISO(job.expectedDelivery), "yyyy-MM-dd")
      : undefined;

  const apt: Appointment = {
    id: job.id,
    bookingId: job.jobNumber,
    customerId: job.customerId,
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    whatsappPhone: job.customerPhone,
    vehicleId: job.vehicleId,
    vehicleRegNumber: job.vehicleRegNumber,
    vehicleMakeModel: job.vehicleMakeModel,
    vehicleColor: input.vehicleColor,
    serviceType,
    date: input.appointmentDate,
    time: input.appointmentTime,
    status: "CONFIRMED",
    whatsappSent: true,
    createdAt: job.createdAt,
    customerFirstName: job.customerName.trim().split(/\s+/)[0],
    customerAddress: input.customerAddress,
    bookingPricingLine: input.bookingPricingLine,
    priceSubtotalExGst: input.priceSubtotalExGst,
    priceGstAmount: input.priceGstAmount,
    priceGrandTotal: input.priceGrandTotal,
    advancePaid: input.advancePaid,
    advancePolicyNote:
      "An advance payment of 30% is required to confirm and pre-schedule your service slot.",
    expectedDeliveryDate,
    deliveryExpectationNote: undefined,
  };

  return buildBookingWhatsAppMessageCompact(apt, input.business);
}

/** Digits only for wa.me (e.g. 919369111655) */
export function whatsappDigits(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) {
    d = d.slice(2);
  }
  if (d.length === 11 && d.startsWith("0")) {
    d = d.slice(1);
  }
  if (d.length === 13 && d.startsWith("910")) {
    d = "91" + d.slice(3);
  }
  if (d.length === 10) return `91${d}`;
  if (d.startsWith("91") && d.length >= 12) return d;
  return d;
}

/**
 * Picks a saved appointment for the “Demo: WhatsApp” preview.
 * Prefers apt-019 (5022) if present, then the richest pricing row, then earliest active booking.
 */
export function pickAppointmentForWhatsAppPreview(appointments: Appointment[]): Appointment | null {
  if (appointments.length === 0) return null;
  const preferred = appointments.find((a) => a.id === "apt-019");
  if (preferred) return preferred;
  const withPricing = appointments.find(
    (a) =>
      a.priceGrandTotal != null &&
      a.status !== "CANCELLED" &&
      a.status !== "COMPLETED" &&
      a.status !== "NOT_ATTENDED"
  );
  if (withPricing) return withPricing;
  const active = appointments.filter(
    (a) =>
      a.status !== "CANCELLED" &&
      a.status !== "COMPLETED" &&
      a.status !== "NOT_ATTENDED"
  );
  if (active.length > 0) {
    return [...active].sort((a, b) => {
      const ta = new Date(`${a.date}T${a.time}`).getTime();
      const tb = new Date(`${b.date}T${b.time}`).getTime();
      return ta - tb;
    })[0]!;
  }
  return appointments[0]!;
}
