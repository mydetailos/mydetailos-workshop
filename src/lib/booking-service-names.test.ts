// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useHighEndServiceStore } from "@/store/high-end-service-store";
import { getJobCardServiceNames } from "@/lib/whatsapp-customer-messages";
import {
  buildBookingConfirmationMessage,
  buildJobCardCreationConfirmationMessage,
  getBookingConfirmationBusiness,
} from "@/lib/booking-confirmation-message";
import { buildAppointmentConfirmedMessage } from "@/lib/appointment-messages";
import { buildJobCardFromAppointment } from "@/lib/job-from-appointment";
import type { Appointment, JobCard, ServiceCatalogItem, Vehicle } from "@/types";

describe("Selected Service Names in Booking & WhatsApp Confirmations", () => {
  beforeEach(() => {
    useHighEndServiceStore.setState({
      services: [
        {
          id: "hes-coating",
          name: "High-End Coating",
          reminderIntervals: [6, 12],
          totalYears: 3,
          estimateAmountInr: 25000,
        },
        {
          id: "hes-ppf",
          name: "Paint Protection Film (PPF)",
          reminderIntervals: [12],
          totalYears: 5,
          estimateAmountInr: 60000,
        },
      ],
    });
  });

  describe("getJobCardServiceNames", () => {
    it("returns catalog services when no high-end services are present", () => {
      const job = {
        services: [
          { name: "Full Wash", price: 1000 },
          { name: "Interior Detailing", price: 3000 },
        ],
      } as unknown as JobCard;

      expect(getJobCardServiceNames(job)).toEqual(["Full Wash", "Interior Detailing"]);
    });

    it("resolves high-end service names from highEndServiceIds", () => {
      const job = {
        services: [],
        highEndServiceIds: ["hes-coating"],
      } as unknown as JobCard;

      expect(getJobCardServiceNames(job)).toEqual(["High-End Coating"]);
    });

    it("combines both catalog services and high-end services", () => {
      const job = {
        services: [{ name: "Engine Bay Cleaning", price: 1500 }],
        highEndServiceIds: ["hes-coating", "hes-ppf"],
      } as unknown as JobCard;

      expect(getJobCardServiceNames(job)).toEqual([
        "Engine Bay Cleaning",
        "High-End Coating",
        "Paint Protection Film (PPF)",
      ]);
    });
  });

  describe("WhatsApp Confirmation Messages", () => {
    const business = getBookingConfirmationBusiness({
      businessName: "Prime Detailers",
      businessAddress: "123 Main St, Mumbai",
      businessPhone: "9876543210",
      businessEmail: "info@primedetailers.com",
    });

    it("shows actual high-end service name instead of generic 'Service' in booking confirmation", () => {
      const apt: Appointment = {
        id: "apt-1",
        bookingId: "BK-2026-0001",
        kind: "BOOKING",
        customerId: "cust-1",
        customerName: "Rahul Sharma",
        customerPhone: "9876543210",
        vehicleId: "veh-1",
        vehicleRegNumber: "MH02AB1234",
        vehicleMakeModel: "BMW 3 Series",
        serviceType: "High-End Coating",
        date: "2026-10-25",
        time: "10:00",
        status: "CONFIRMED",
        whatsappSent: true,
        createdAt: "2026-10-20T10:00:00Z",
        priceSubtotalExGst: 25000,
        priceGstAmount: 4500,
        priceGrandTotal: 29500,
      };

      const msg = buildBookingConfirmationMessage(apt, business);
      expect(msg).toContain("High-End Coating");
      expect(msg).not.toContain("· Service ·");
    });

    it("shows actual high-end service name in job card creation WhatsApp confirmation", () => {
      const job = {
        id: "jc-1",
        jobNumber: "JC-2026-0001",
        customerId: "cust-1",
        customerName: "Rahul Sharma",
        customerPhone: "9876543210",
        vehicleId: "veh-1",
        vehicleRegNumber: "MH02AB1234",
        vehicleMakeModel: "BMW 3 Series",
        services: [],
        highEndServiceIds: ["hes-coating"],
        createdAt: "2026-10-20T10:00:00Z",
      } as unknown as JobCard;

      const msg = buildJobCardCreationConfirmationMessage({
        job,
        business,
        priceSubtotalExGst: 25000,
        priceGstAmount: 4500,
        priceGrandTotal: 29500,
        appointmentDate: "2026-10-20",
        appointmentTime: "10:00",
      });

      expect(msg).toContain("High-End Coating");
      expect(msg).not.toContain("· Service ·");
    });

    it("includes Service line in buildAppointmentConfirmedMessage when serviceType is set", () => {
      const apt: Appointment = {
        id: "apt-1",
        bookingId: "AP-2026-0001",
        kind: "APPOINTMENT",
        customerId: "cust-1",
        customerName: "Rahul Sharma",
        customerPhone: "9876543210",
        vehicleId: "veh-1",
        vehicleRegNumber: "MH02AB1234",
        vehicleMakeModel: "BMW 3 Series",
        serviceType: "High-End Coating",
        date: "2026-10-25",
        time: "10:00",
        status: "CONFIRMED",
        whatsappSent: true,
        createdAt: "2026-10-20T10:00:00Z",
      };

      const msg = buildAppointmentConfirmedMessage(apt, "Prime Detailers");
      expect(msg).toContain("Service: High-End Coating");
    });
  });

  describe("buildJobCardFromAppointment", () => {
    it("preserves High-End Coating in service name and links highEndServiceIds", () => {
      const apt: Appointment = {
        id: "apt-1",
        bookingId: "BK-2026-0001",
        kind: "BOOKING",
        customerId: "cust-1",
        customerName: "Rahul Sharma",
        customerPhone: "9876543210",
        vehicleId: "veh-1",
        vehicleRegNumber: "MH02AB1234",
        vehicleMakeModel: "BMW 3 Series",
        serviceType: "High-End Coating",
        date: "2026-10-25",
        time: "10:00",
        status: "CONFIRMED",
        whatsappSent: true,
        createdAt: "2026-10-20T10:00:00Z",
        priceGrandTotal: 29500,
      };

      const vehicle: Vehicle = {
        id: "veh-1",
        customerId: "cust-1",
        registrationNumber: "MH02AB1234",
        make: "BMW",
        model: "3 Series",
        segment: "SEDAN",
        createdAt: "2026-10-20T10:00:00Z",
        updatedAt: "2026-10-20T10:00:00Z",
      };

      const catalog: ServiceCatalogItem[] = [];

      const job = buildJobCardFromAppointment({
        apt,
        jobId: "jc-1",
        jobNumber: "JC-001",
        branchId: "br-1",
        vehicle,
        catalog,
        createdBy: "usr-1",
      });

      expect(job.services[0].name).toBe("High-End Coating");
      expect(job.highEndServiceIds).toEqual(["hes-coating"]);
    });
  });
});
