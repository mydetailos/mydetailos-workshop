import { isAllBranchesScope } from "@/lib/all-branches";
import { getAppointmentDisplayId } from "@/lib/appointment-ids";
import type {
  Appointment,
  Branch,
  JobCard,
  ServiceCatalogItem,
  ServiceItem,
  Vehicle,
  VehicleSegment,
} from "@/types";
import {
  useHighEndServiceStore,
  highEndConfigToCatalogItem,
} from "@/store/high-end-service-store";

export function resolveJobBranchId(
  currentBranch: Branch | null | undefined,
  branches: Branch[]
): string {
  if (currentBranch && !isAllBranchesScope(currentBranch)) return currentBranch.id;
  const first = branches.find((b) => b.isActive);
  return first?.id ?? "br-main";
}

export function findCatalogServiceForAppointment(
  catalog: ServiceCatalogItem[],
  serviceType: string
): ServiceCatalogItem | null {
  const t = serviceType.trim().toLowerCase();
  if (!t) return null;
  const exact = catalog.find((s) => s.name.trim().toLowerCase() === t);
  if (exact) return exact;
  const partial = catalog.find(
    (s) =>
      s.name.toLowerCase().includes(t) ||
      t.includes(s.name.toLowerCase())
  );
  if (partial) return partial;

  const hesCatalog = useHighEndServiceStore.getState().services;
  const hesMatch = hesCatalog.find(
    (h) =>
      h.name.trim().toLowerCase() === t ||
      h.name.toLowerCase().includes(t) ||
      t.includes(h.name.toLowerCase())
  );
  if (hesMatch) {
    return highEndConfigToCatalogItem(hesMatch);
  }

  return null;
}

function estimatedAmountFromAppointment(
  apt: Appointment,
  fallbackServicePrice: number
): number {
  if (typeof apt.priceGrandTotal === "number" && apt.priceGrandTotal > 0) {
    return Math.round(apt.priceGrandTotal);
  }
  if (
    typeof apt.priceSubtotalExGst === "number" &&
    typeof apt.priceGstAmount === "number"
  ) {
    const sum = apt.priceSubtotalExGst + apt.priceGstAmount;
    if (sum > 0) return Math.round(sum);
  }
  return Math.max(0, Math.round(fallbackServicePrice));
}

/**
 * Build a received job card from a confirmed appointment (single primary service line).
 */
export function buildJobCardFromAppointment(params: {
  apt: Appointment;
  jobId: string;
  jobNumber: string;
  branchId: string;
  vehicle: Vehicle | undefined;
  catalog: ServiceCatalogItem[];
  createdBy: string;
}): JobCard {
  const { apt, jobId, jobNumber, branchId, vehicle, catalog, createdBy } = params;
  const vehicleSegment = vehicle?.segment ?? ("HATCHBACK" as VehicleSegment);
  const now = new Date().toISOString();
  const cat = findCatalogServiceForAppointment(catalog, apt.serviceType);
  const priceFromCatalog = cat
    ? (cat.segmentPricing[vehicleSegment as keyof typeof cat.segmentPricing] ??
      cat.defaultPrice)
    : 0;

  const estimatedAmount = estimatedAmountFromAppointment(apt, priceFromCatalog);
  const linePrice =
    estimatedAmount > 0 ? estimatedAmount : Math.max(0, Math.round(priceFromCatalog));

  const serviceCatalogId = cat?.id ?? `srv-apt-${jobId.slice(-8)}`;

  const serviceItem: ServiceItem = {
    id: `si-${jobId}-0`,
    jobCardId: jobId,
    serviceCatalogId,
    name: apt.serviceType.trim() || cat?.name || "Service",
    price: linePrice,
    isCompleted: false,
    durationMinutes: cat?.durationMinutes,
  };

  const incentivePercent = 0;
  const incentiveAmount = Math.round(((estimatedAmount || linePrice) * incentivePercent) / 100);

  const expectedDelivery =
    apt.expectedDeliveryDate && /^\d{4}-\d{2}-\d{2}$/.test(apt.expectedDeliveryDate)
      ? new Date(`${apt.expectedDeliveryDate}T18:00:00`).toISOString()
      : new Date(`${apt.date}T18:00:00`).toISOString();

  const notesParts = [apt.notes?.trim(), apt.deliveryExpectationNote?.trim()].filter(Boolean);
  const combinedNotes = notesParts.length ? notesParts.join("\n") : undefined;

  const hesCatalog = useHighEndServiceStore.getState().services;
  const aptServiceLower = apt.serviceType.toLowerCase().trim();
  const matchingHes = aptServiceLower
    ? hesCatalog.filter(
        (hes) =>
          aptServiceLower.includes(hes.name.toLowerCase()) ||
          hes.name.toLowerCase().includes(aptServiceLower)
      )
    : [];
  const highEndServiceIds = matchingHes.length > 0 ? matchingHes.map((h) => h.id) : undefined;

  return {
    id: jobId,
    jobNumber,
    branchId,
    customerId: apt.customerId,
    customerName: apt.customerName,
    customerPhone: apt.customerPhone,
    vehicleId: apt.vehicleId,
    vehicleRegNumber: apt.vehicleRegNumber,
    vehicleMakeModel: apt.vehicleMakeModel,
    vehicleSegment,
    odometerReading: apt.odometerReading,
    mechanicId: apt.mechanicId,
    mechanicName: apt.mechanicName,
    status: "RECEIVED",
    reportedIssues: `From ${getAppointmentDisplayId(apt)} · ${apt.date} ${apt.time}`,
    expectedDelivery,
    services: [serviceItem],
    highEndServiceIds,
    estimatedAmount: estimatedAmount || linePrice,
    incentivePercent,
    incentiveAmount,
    notes: combinedNotes,
    appointmentId: apt.id,
    appointmentBookingRef: getAppointmentDisplayId(apt),
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}
