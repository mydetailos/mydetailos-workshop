// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  useHighEndServiceStore,
  highEndConfigToCatalogItem,
  buildHighEndSegmentPricing,
  type HighEndServiceConfig,
} from "@/store/high-end-service-store";
import { filterCatalogServices } from "@/components/services/searchable-service-select";
import {
  findCatalogServiceForAppointment,
  buildJobCardFromAppointment,
} from "@/lib/job-from-appointment";
import type { Appointment, ServiceCatalogItem, Vehicle } from "@/types";

describe("High-End Services in Appointments", () => {
  const sampleHighEnd: HighEndServiceConfig = {
    id: "hes-ppf-01",
    name: "PPF Ultra Protection",
    reminderIntervals: [6, 12, 18, 24],
    totalYears: 4,
    estimateAmountInr: 50_000,
    segmentPricing: buildHighEndSegmentPricing({
      HATCHBACK: 45_000,
      SEDAN: 50_000,
      SUV: 55_000,
      BIKE: 20_000,
    }),
  };

  const sampleStandardCatalog: ServiceCatalogItem[] = [
    {
      id: "srv-wash",
      name: "Full Body Wash",
      description: "Standard exterior wash",
      defaultPrice: 800,
      segmentPricing: {
        HATCHBACK: 700,
        SEDAN: 800,
        SUV: 1000,
        LUXURY: 1200,
        MUV: 1000,
        COMPACT_SUV: 900,
        BIKE: 400,
      },
      category: "Washing",
      isActive: true,
      isHighEnd: false,
      isAddon: false,
      incentivePercent: 5,
    },
    {
      id: "srv-addon",
      name: "Windshield Treatment",
      description: "Addon service",
      defaultPrice: 500,
      segmentPricing: {
        HATCHBACK: 500,
        SEDAN: 500,
        SUV: 500,
        LUXURY: 500,
        MUV: 500,
        COMPACT_SUV: 500,
        BIKE: 500,
      },
      category: "Add-ons",
      isActive: true,
      isHighEnd: false,
      isAddon: true,
      incentivePercent: 0,
    },
  ];

  beforeEach(() => {
    useHighEndServiceStore.setState({
      services: [sampleHighEnd],
    });
  });

  describe("highEndConfigToCatalogItem", () => {
    it("converts a HighEndServiceConfig into a valid ServiceCatalogItem", () => {
      const item = highEndConfigToCatalogItem(sampleHighEnd);
      expect(item.id).toBe("hes-ppf-01");
      expect(item.name).toBe("PPF Ultra Protection");
      expect(item.category).toBe("High-End");
      expect(item.isHighEnd).toBe(true);
      expect(item.isActive).toBe(true);
      expect(item.isAddon).toBe(false);
      expect(item.defaultPrice).toBe(50_000);
      expect(item.segmentPricing.SUV).toBe(55_000);
    });
  });

  describe("filterCatalogServices with combined services", () => {
    it("includes high-end services in searchable dropdown items", () => {
      const combined = [
        ...sampleStandardCatalog,
        highEndConfigToCatalogItem(sampleHighEnd),
      ];

      // Omit addons, include active standard and high-end services
      const list = filterCatalogServices(combined, "");
      expect(list.map((s) => s.name)).toEqual([
        "Full Body Wash",
        "PPF Ultra Protection",
      ]);
    });

    it("filters high-end services by service name query", () => {
      const combined = [
        ...sampleStandardCatalog,
        highEndConfigToCatalogItem(sampleHighEnd),
      ];

      const list = filterCatalogServices(combined, "ppf");
      expect(list).toHaveLength(1);
      expect(list[0]?.name).toBe("PPF Ultra Protection");
    });

    it("filters high-end services by 'high-end' category query", () => {
      const combined = [
        ...sampleStandardCatalog,
        highEndConfigToCatalogItem(sampleHighEnd),
      ];

      const list = filterCatalogServices(combined, "high-end");
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe("hes-ppf-01");
    });
  });

  describe("findCatalogServiceForAppointment", () => {
    it("finds a high-end service in combined catalog", () => {
      const combined = [
        ...sampleStandardCatalog,
        highEndConfigToCatalogItem(sampleHighEnd),
      ];
      const match = findCatalogServiceForAppointment(combined, "PPF Ultra Protection");
      expect(match).not.toBeNull();
      expect(match?.id).toBe("hes-ppf-01");
      expect(match?.isHighEnd).toBe(true);
    });

    it("falls back to useHighEndServiceStore when service is not in standard catalog", () => {
      const match = findCatalogServiceForAppointment(sampleStandardCatalog, "PPF Ultra Protection");
      expect(match).not.toBeNull();
      expect(match?.id).toBe("hes-ppf-01");
      expect(match?.isHighEnd).toBe(true);
    });
  });

  describe("buildJobCardFromAppointment with High-End Service", () => {
    it("populates highEndServiceIds and segment price when converted to job card", () => {
      const apt: Appointment = {
        id: "apt-101",
        appointmentNumber: "APT-101",
        customerId: "cust-1",
        customerName: "John Doe",
        customerPhone: "9876543210",
        vehicleId: "veh-1",
        vehicleRegNumber: "KA01AB1234",
        vehicleMakeModel: "Hyundai Creta",
        serviceType: "PPF Ultra Protection",
        date: "2026-10-25",
        time: "10:00",
        status: "CONFIRMED",
        createdAt: new Date().toISOString(),
      };

      const vehicle: Vehicle = {
        id: "veh-1",
        customerId: "cust-1",
        customerName: "John Doe",
        registrationNumber: "KA01AB1234",
        make: "Hyundai",
        model: "Creta",
        segment: "SUV",
        fuelType: "PETROL",
        color: "White",
        year: 2024,
      };

      const combined = [
        ...sampleStandardCatalog,
        highEndConfigToCatalogItem(sampleHighEnd),
      ];

      const jobCard = buildJobCardFromAppointment({
        apt,
        jobId: "jc-101",
        jobNumber: "JC-101",
        branchId: "br-1",
        vehicle,
        catalog: combined,
        createdBy: "usr-01",
      });

      expect(jobCard.services).toHaveLength(1);
      expect(jobCard.services[0].name).toBe("PPF Ultra Protection");
      // Creta segment is SUV, so price is 55,000 from sampleHighEnd.segmentPricing.SUV
      expect(jobCard.services[0].price).toBe(55_000);
      expect(jobCard.highEndServiceIds).toEqual(["hes-ppf-01"]);
    });
  });
});
