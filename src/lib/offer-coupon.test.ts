import { describe, expect, it } from "vitest";
import { computeOfferCouponDiscount, findOfferByCode } from "@/lib/offer-coupon";
import type { OfferBroadcast } from "@/types";

describe("offer-coupon", () => {
  const baseOffer: OfferBroadcast = {
    id: "off-diwali80",
    name: "DIWALI80",
    code: "DIWALI80",
    validFrom: "2026-10-20",
    validTill: "2026-10-21",
    discountType: "FLAT",
    discountValue: 300,
    minBillAmount: 500,
    maxDiscount: 0,
    applicableOn: "FULL_BILL",
    scope: "ALL_ITEMS",
    details: "Diwali flat ₹300 off on bills above ₹500",
    selectedCustomerIds: ["cust-hitech"],
    status: "DRAFT",
    sentCount: 0,
    createdAt: "2026-10-20T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
  };

  it("finds offer by code case-insensitively", () => {
    const offers = [baseOffer];
    expect(findOfferByCode(offers, "diwali80")).toBeDefined();
    expect(findOfferByCode(offers, "DIWALI80")).toBeDefined();
    expect(findOfferByCode(offers, "  diwali80  ")).toBeDefined();
    expect(findOfferByCode(offers, "UNKNOWN")).toBeUndefined();
  });

  it("computes discount for DIWALI80 when restrictToSelectedCustomers is not set", () => {
    const res = computeOfferCouponDiscount(baseOffer, {
      customerId: "cust-abcd",
      servicesSubtotal: 1710,
      partsSubtotal: 0,
      selectedServiceIds: ["srv-wash"],
      selectedPartIds: [],
      now: new Date("2026-10-20T12:00:00"),
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.amount).toBe(300);
      expect(res.offer.code).toBe("DIWALI80");
    }
  });

  it("enforces customer restriction when restrictToSelectedCustomers is true", () => {
    const restrictedOffer: OfferBroadcast = {
      ...baseOffer,
      restrictToSelectedCustomers: true,
      selectedCustomerIds: ["cust-vip-1"],
    };

    // Different customer
    const failRes = computeOfferCouponDiscount(restrictedOffer, {
      customerId: "cust-abcd",
      servicesSubtotal: 1710,
      partsSubtotal: 0,
      selectedServiceIds: ["srv-wash"],
      selectedPartIds: [],
      now: new Date("2026-10-20T12:00:00"),
    });
    expect(failRes.ok).toBe(false);
    if (!failRes.ok) {
      expect(failRes.error).toBe("This coupon is only valid for selected customers");
    }

    // Matching customer
    const passRes = computeOfferCouponDiscount(restrictedOffer, {
      customerId: "cust-vip-1",
      servicesSubtotal: 1710,
      partsSubtotal: 0,
      selectedServiceIds: ["srv-wash"],
      selectedPartIds: [],
      now: new Date("2026-10-20T12:00:00"),
    });
    expect(passRes.ok).toBe(true);
    if (passRes.ok) {
      expect(passRes.amount).toBe(300);
    }
  });

  it("validates minimum bill amount", () => {
    const res = computeOfferCouponDiscount(baseOffer, {
      customerId: "cust-abcd",
      servicesSubtotal: 400,
      partsSubtotal: 0,
      selectedServiceIds: ["srv-wash"],
      selectedPartIds: [],
      now: new Date("2026-10-20T12:00:00"),
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("Minimum bill of ₹500 required");
    }
  });

  it("validates expiration date", () => {
    const expiredRes = computeOfferCouponDiscount(baseOffer, {
      customerId: "cust-abcd",
      servicesSubtotal: 1710,
      partsSubtotal: 0,
      selectedServiceIds: ["srv-wash"],
      selectedPartIds: [],
      now: new Date("2026-10-25T12:00:00"),
    });

    expect(expiredRes.ok).toBe(false);
    if (!expiredRes.ok) {
      expect(expiredRes.error).toBe("This coupon has expired");
    }
  });
});
