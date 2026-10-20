import { describe, it, expect, beforeEach } from "vitest";
import {
  useHighEndServiceStore,
  highEndPriceForSegment,
  DEFAULT_HIGH_END_SERVICES,
} from "@/store/high-end-service-store";
import { computeGstFromSubtotal } from "@/lib/gst-tax";
import { buildQuotationWhatsAppMessage } from "@/lib/whatsapp-customer-messages";
import type { Quotation, ServiceCatalogItem, ServiceItem, JobCard } from "@/types";

describe("Quotation High-End Services", () => {
  beforeEach(() => {
    useHighEndServiceStore.setState({
      services: DEFAULT_HIGH_END_SERVICES,
    });
  });

  it("resolves correct segment pricing for high-end services", () => {
    const ppf = DEFAULT_HIGH_END_SERVICES.find((s) => s.id === "hes-001")!;
    expect(ppf).toBeDefined();

    // Segment prices defined in DEFAULT_HIGH_END_SERVICES for PPF Coating
    expect(highEndPriceForSegment(ppf, "HATCHBACK")).toBe(40000);
    expect(highEndPriceForSegment(ppf, "SEDAN")).toBe(45000);
    expect(highEndPriceForSegment(ppf, "SUV")).toBe(50000);
    expect(highEndPriceForSegment(ppf, "BIKE")).toBe(15000);
  });

  it("calculates subtotal and GST correctly when combining regular catalog and high-end services", () => {
    const ppf = DEFAULT_HIGH_END_SERVICES.find((s) => s.id === "hes-001")!;
    const ceramic = DEFAULT_HIGH_END_SERVICES.find((s) => s.id === "hes-002")!;

    const segment = "SUV";
    const ppfPrice = highEndPriceForSegment(ppf, segment); // 50,000
    const ceramicPrice = highEndPriceForSegment(ceramic, segment); // 40,000
    const regularServicePrice = 2500; // e.g. Exterior Foam Wash

    const subtotal = ppfPrice + ceramicPrice + regularServicePrice;
    expect(subtotal).toBe(92500);

    const { taxAmount, grandTotal } = computeGstFromSubtotal(subtotal, "REGISTERED");
    expect(taxAmount).toBe(Math.round(92500 * 0.18));
    expect(grandTotal).toBe(subtotal + taxAmount);
  });

  it("generates WhatsApp quotation message displaying high-end service items", () => {
    const q: Quotation = {
      id: "quot-101",
      quotationNumber: "QUO-2026-0042",
      customerId: "cust-1",
      customerName: "Rahul Sharma",
      customerPhone: "+91-9876543210",
      vehicleId: "veh-1",
      vehicleRegNumber: "DL01AB1234",
      vehicleMakeModel: "Hyundai Creta",
      vehicleSegment: "SUV",
      services: [
        {
          serviceCatalogId: "hes-001",
          name: "PPF Coating",
          price: 50000,
          catalogPrice: 50000,
          isCustomPrice: false,
          priceSource: "CATALOG",
        },
        {
          serviceCatalogId: "svc-wash",
          name: "Deep Interior Cleaning",
          price: 3500,
          catalogPrice: 3500,
          isCustomPrice: false,
          priceSource: "CATALOG",
        },
      ],
      subtotal: 53500,
      taxRate: 0.18,
      taxAmount: 9630,
      grandTotal: 63130,
      status: "DRAFT",
      sentViaWhatsApp: false,
      validUntil: "2026-11-20",
      createdBy: "usr-001",
      createdAt: new Date().toISOString(),
    };

    const message = buildQuotationWhatsAppMessage(q, { businessName: "AutoSpa Studio" });

    expect(message).toContain("QUO-2026-0042");
    expect(message).toContain("Rahul");
    expect(message).toContain("PPF Coating");
    expect(message).toContain("Deep Interior Cleaning");
    expect(message).toContain("₹50,000");
    expect(message).toContain("₹3,500");
    expect(message).toContain("₹63,130");
  });

  it("separates high-end services into highEndServiceIds upon job card conversion", () => {
    const hesCatalog = useHighEndServiceStore.getState().services;

    const quotationServices: Quotation["services"] = [
      {
        serviceCatalogId: "hes-001",
        name: "PPF Coating",
        price: 45000,
        catalogPrice: 45000,
      },
      {
        serviceCatalogId: "svc-regular-1",
        name: "General Wash",
        price: 1500,
        catalogPrice: 1500,
      },
    ];

    const highEndIds: string[] = [];
    const regularServiceLines: typeof quotationServices = [];

    for (const s of quotationServices) {
      if (hesCatalog.some((h) => h.id === s.serviceCatalogId)) {
        highEndIds.push(s.serviceCatalogId);
      } else {
        regularServiceLines.push(s);
      }
    }

    expect(highEndIds).toEqual(["hes-001"]);
    expect(regularServiceLines).toHaveLength(1);
    expect(regularServiceLines[0].name).toBe("General Wash");

    // Converted JobCard structure
    const convertedJobCard: Partial<JobCard> = {
      services: regularServiceLines.map((s, idx) => ({
        id: `si-test-${idx}`,
        jobCardId: "jc-test",
        serviceCatalogId: s.serviceCatalogId,
        name: s.name,
        price: s.price,
        catalogPrice: s.catalogPrice,
        isCompleted: false,
      })),
      highEndServiceIds: highEndIds.length > 0 ? highEndIds : undefined,
      highEndFirstFollowUpMonthsByServiceId:
        highEndIds.length > 0
          ? Object.fromEntries(
              highEndIds.map((hesId) => {
                const cfg = hesCatalog.find((h) => h.id === hesId);
                return [hesId, cfg?.reminderIntervals[0] ?? 6] as const;
              })
            )
          : undefined,
    };

    expect(convertedJobCard.highEndServiceIds).toEqual(["hes-001"]);
    expect(convertedJobCard.services).toHaveLength(1);
    expect(convertedJobCard.services![0].serviceCatalogId).toBe("svc-regular-1");
    expect(convertedJobCard.highEndFirstFollowUpMonthsByServiceId?.["hes-001"]).toBe(6);
  });
});
