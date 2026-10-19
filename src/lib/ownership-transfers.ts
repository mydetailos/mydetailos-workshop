import type { Customer, Vehicle } from "@/types";
import { formatDate } from "@/lib/utils";

export type OwnershipTimelineItem =
  | {
      kind: "owner";
      customerId: string;
      name: string;
      detailLine: string;
      isCurrent: boolean;
    }
  | {
      kind: "transfer";
      transferredOn: string;
      reason?: string;
    };

/** Tag when this customer is the transferee (current owner after at least one transfer). */
export function getTransferTagForCustomer(
  vehicle: Vehicle,
  customerId: string
): { fromCustomerName: string; formattedDate: string } | null {
  if (vehicle.customerId !== customerId) return null;
  const prev = vehicle.previousOwners;
  if (!prev?.length) return null;
  const last = prev[prev.length - 1];
  return {
    fromCustomerName: last.customerName,
    formattedDate: formatDate(last.transferDate),
  };
}

function ownerDetailLine(
  vehicle: Vehicle,
  customers: Customer[],
  prev: NonNullable<Vehicle["previousOwners"]>,
  index: number
): string {
  if (index === 0) {
    const cust = customers.find((c) => c.id === prev[0].customerId);
    const from = cust?.createdAt ? formatDate(cust.createdAt) : `~${vehicle.year}`;
    return `Original Owner · from ${from}`;
  }
  return `Previous Owner · since ${formatDate(prev[index - 1].transferDate)}`;
}

export function buildOwnershipTimeline(
  vehicle: Vehicle,
  customers: Customer[]
): OwnershipTimelineItem[] | null {
  const prev = vehicle.previousOwners ?? [];
  if (prev.length === 0) return null;

  const items: OwnershipTimelineItem[] = [];

  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    items.push({
      kind: "owner",
      customerId: p.customerId,
      name: p.customerName,
      detailLine: ownerDetailLine(vehicle, customers, prev, i),
      isCurrent: false,
    });
    items.push({
      kind: "transfer",
      transferredOn: p.transferDate,
      reason: p.reason,
    });
  }

  items.push({
    kind: "owner",
    customerId: vehicle.customerId,
    name: vehicle.customerName,
    detailLine: `Current Owner · since ${formatDate(prev[prev.length - 1].transferDate)}`,
    isCurrent: true,
  });

  return items;
}

export interface TransferredOutVehicleItem {
  vehicle: Vehicle;
  transferredToCustomerId: string;
  transferredToCustomerName: string;
  transferredDate: string;
  reason?: string;
}

/**
 * Returns vehicles previously owned by this customer that were transferred to someone else,
 * with details on who received each vehicle, transfer date, and optional reason.
 */
export function getTransferredOutVehiclesForCustomer(
  vehicles: Vehicle[],
  customerId: string,
  customers?: Customer[]
): TransferredOutVehicleItem[] {
  const result: TransferredOutVehicleItem[] = [];

  for (const v of vehicles) {
    if (v.customerId === customerId) continue;
    const prev = v.previousOwners;
    if (!prev || prev.length === 0) continue;

    for (let i = prev.length - 1; i >= 0; i--) {
      const p = prev[i];
      if (p.customerId === customerId) {
        const nextOwner =
          i + 1 < prev.length
            ? { id: prev[i + 1].customerId, name: prev[i + 1].customerName }
            : { id: v.customerId, name: v.customerName };

        const matchedCustomer = customers?.find((c) => c.id === nextOwner.id);

        result.push({
          vehicle: v,
          transferredToCustomerId: nextOwner.id,
          transferredToCustomerName: matchedCustomer?.name ?? nextOwner.name,
          transferredDate: p.transferDate,
          reason: p.reason,
        });
        break;
      }
    }
  }

  return result.sort(
    (a, b) => new Date(b.transferredDate).getTime() - new Date(a.transferredDate).getTime()
  );
}
