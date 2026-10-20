import { describe, expect, it, afterEach } from "vitest";
import { buildInvoiceFromJobCard } from "@/lib/invoice-from-job-card";
import { useServiceCatalogStore } from "@/store/service-catalog-store";
import { useHighEndServiceStore } from "@/store/high-end-service-store";
import { useMembershipStore } from "@/store/membership-store";
import { useSettingsStore } from "@/store/settings-store";
import type { JobCard } from "@/types";

const originalCatalog = useServiceCatalogStore.getState().catalog;
const originalHighEndServices = useHighEndServiceStore.getState().services;
const originalMembershipPackages = useMembershipStore.getState().packages;
const originalMembershipSubscriptions = useMembershipStore.getState().subscriptions;
const originalGstStatus = useSettingsStore.getState().gstRegistrationStatus;

afterEach(() => {
  useServiceCatalogStore.setState({ catalog: originalCatalog });
  useHighEndServiceStore.setState({ services: originalHighEndServices });
  useMembershipStore.setState({
    packages: originalMembershipPackages,
    subscriptions: originalMembershipSubscriptions,
  });
  useSettingsStore.setState({ gstRegistrationStatus: originalGstStatus });
});

describe("buildInvoiceFromJobCard", () => {
  it("does not double count membership activation when a normal service is also selected", () => {
    useSettingsStore.setState({ gstRegistrationStatus: "NOT_REGISTERED" });
    useHighEndServiceStore.setState({ services: [] });
    useMembershipStore.setState({ packages: [], subscriptions: [] });
    useServiceCatalogStore.setState({
      catalog: [
        {
          id: "svc-1",
          name: "Interior Detailing",
          category: "Detailing",
          defaultPrice: 500,
          isActive: true,
          segmentPricing: {
            HATCHBACK: 500,
            SEDAN: 500,
            SUV: 500,
            LUXURY: 500,
            MUV: 500,
            COMPACT_SUV: 500,
            BIKE: 500,
          },
        } as never,
      ],
    });

    const job: JobCard = {
      id: "jc-1",
      jobNumber: "JC-2026-0001",
      branchId: "br-1",
      customerId: "cust-1",
      customerName: "Meera Joshi",
      customerPhone: "9810011004",
      vehicleId: "veh-1",
      vehicleRegNumber: "DL01AB1274",
      vehicleMakeModel: "Maruti Baleno",
      vehicleSegment: "HATCHBACK",
      status: "DELIVERED",
      reportedIssues: "—",
      expectedDelivery: "2026-08-28T12:00:00.000Z",
      services: [
        {
          id: "line-1",
          jobCardId: "jc-1",
          serviceCatalogId: "svc-1",
          name: "Interior Detailing",
          price: 500,
          catalogPrice: 500,
          priceSource: "CATALOG",
          isCompleted: true,
        },
      ],
      estimatedAmount: 5500,
      incentivePercent: 0,
      incentiveAmount: 0,
      membershipActivationId: "memsub-1",
      membershipActivationPackageId: "pkg-1",
      membershipActivationPackageName: "Monthly",
      membershipActivationAmount: 5000,
      createdBy: "usr-1",
      createdAt: "2026-08-28T10:00:00.000Z",
      updatedAt: "2026-08-28T10:00:00.000Z",
    };

    const invoice = buildInvoiceFromJobCard(job, "INV-2026-0001", "inv-1");

    expect(invoice.subtotal).toBe(5500);
    expect(invoice.grandTotal).toBe(5500);
    expect(invoice.lineItems).toHaveLength(2);
    expect(invoice.lineItems[0]?.description).toBe("Interior Detailing");
    expect(invoice.lineItems[0]?.total).toBe(500);
    expect(invoice.lineItems[1]?.description).toBe("Monthly membership");
    expect(invoice.lineItems[1]?.total).toBe(5000);
  });

  it("propagates coupon discount and voucher code from job card and computes taxable total", () => {
    useSettingsStore.setState({ gstRegistrationStatus: "NOT_REGISTERED" });
    useHighEndServiceStore.setState({
      services: [
        {
          id: "hes-ppf",
          name: "Full Body PPF",
          category: "PPF",
          estimateAmountInr: 35000,
          isActive: true,
          pricingBySegment: {
            HATCHBACK: 35000,
            SEDAN: 38000,
            SUV: 42000,
            LUXURY: 50000,
            MUV: 40000,
            COMPACT_SUV: 36000,
            BIKE: 20000,
          },
        } as never,
      ],
    });

    const job: JobCard = {
      id: "jc-2",
      jobNumber: "JC-2026-0002",
      branchId: "br-1",
      customerId: "cust-2",
      customerName: "Rohan Verma",
      customerPhone: "9876543210",
      vehicleId: "veh-2",
      vehicleRegNumber: "MH02CD5678",
      vehicleMakeModel: "Hyundai i20",
      vehicleSegment: "HATCHBACK",
      status: "DELIVERED",
      reportedIssues: "—",
      expectedDelivery: "2026-08-29T12:00:00.000Z",
      services: [],
      highEndServiceIds: ["hes-ppf"],
      couponCode: "SAVE10",
      couponDiscount: 3500,
      discountAmount: 3500,
      estimatedAmount: 31500,
      incentivePercent: 0,
      incentiveAmount: 0,
      createdBy: "usr-1",
      createdAt: "2026-08-29T10:00:00.000Z",
      updatedAt: "2026-08-29T10:00:00.000Z",
    };

    const invoice = buildInvoiceFromJobCard(job, "INV-2026-0002", "inv-2");

    expect(invoice.subtotal).toBe(35000);
    expect(invoice.discountAmount).toBe(3500);
    expect(invoice.couponCode).toBe("SAVE10");
    expect(invoice.grandTotal).toBe(31500);
    expect(invoice.lineItems).toHaveLength(1);
    expect(invoice.lineItems[0]?.total).toBe(35000);
  });
});
