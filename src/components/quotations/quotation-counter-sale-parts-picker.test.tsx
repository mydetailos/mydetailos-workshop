/* @vitest-environment jsdom */

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  QuotationCounterSalePartsPicker,
  quotationPartLineTotal,
  quotationPartsSubtotal,
} from "./quotation-counter-sale-parts-picker";
import type { QuotationPartLine, Part } from "@/types";

const mockPart: Part = {
  id: "part-1",
  name: "Microfiber Towel 40x40",
  sku: "TOWEL-40",
  primaryUnit: "PCS",
  unitPrice: 150,
  minStockAlert: 10,
  usedIn: "BOTH",
  costPrice: 80,
  currentStock: 50,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

vi.mock("@/store/inventory-store", () => ({
  useInventoryStore: (selector: (state: { parts: Part[] }) => unknown) =>
    selector({
      parts: [mockPart],
    }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("QuotationCounterSalePartsPicker", () => {
  it("computes line total and parts subtotal correctly", () => {
    expect(quotationPartLineTotal({ quantity: 3, unitPrice: 150 })).toBe(450);
    expect(quotationPartLineTotal({ quantity: 2, unitPrice: 199.5 })).toBe(399);

    const lines: QuotationPartLine[] = [
      {
        partId: "part-1",
        name: "Microfiber Towel",
        sku: "TOWEL-40",
        quantity: 2,
        unit: "PCS",
        unitPrice: 150,
        lineTotal: 300,
      },
      {
        partId: "part-2",
        name: "Ceramic Spray",
        sku: "SPRAY-100",
        quantity: 1,
        unit: "BOTTLE",
        unitPrice: 500,
        lineTotal: 500,
      },
    ];

    expect(quotationPartsSubtotal(lines)).toBe(800);
  });

  it("renders selected parts with price and pencil button", () => {
    const lines: QuotationPartLine[] = [
      {
        partId: "part-1",
        name: "Microfiber Towel 40x40",
        sku: "TOWEL-40",
        quantity: 2,
        unit: "PCS",
        unitPrice: 150,
        catalogPrice: 150,
        isCustomPrice: false,
        lineTotal: 300,
      },
    ];

    const onLinesChange = vi.fn();
    render(<QuotationCounterSalePartsPicker lines={lines} onLinesChange={onLinesChange} />);

    expect(screen.getByText("Microfiber Towel 40x40")).toBeDefined();
    expect(screen.getByText("₹300")).toBeDefined();
    expect(screen.getByText("@ ₹150/PCS")).toBeDefined();
  });

  it("allows editing custom unit price via pencil button", () => {
    const lines: QuotationPartLine[] = [
      {
        partId: "part-1",
        name: "Microfiber Towel 40x40",
        sku: "TOWEL-40",
        quantity: 2,
        unit: "PCS",
        unitPrice: 150,
        catalogPrice: 150,
        isCustomPrice: false,
        lineTotal: 300,
      },
    ];

    const onLinesChange = vi.fn();
    const { container } = render(
      <QuotationCounterSalePartsPicker lines={lines} onLinesChange={onLinesChange} />
    );

    // Click the pencil button (find button inside the price row)
    const pencilBtn = container.querySelector("button svg.lucide-pencil")?.closest("button");
    expect(pencilBtn).toBeDefined();
    fireEvent.click(pencilBtn!);

    // An input field should appear for ₹/unit
    const input = screen.getByDisplayValue("150");
    expect(input).toBeDefined();

    // Type a new price and blur
    fireEvent.change(input, { target: { value: "180" } });
    fireEvent.blur(input);

    expect(onLinesChange).toHaveBeenCalledTimes(1);
    const updatedLines = onLinesChange.mock.calls[0]![0] as QuotationPartLine[];
    expect(updatedLines[0]!.unitPrice).toBe(180);
    expect(updatedLines[0]!.lineTotal).toBe(360);
    expect(updatedLines[0]!.isCustomPrice).toBe(true);
    expect(updatedLines[0]!.catalogPrice).toBe(150);
  });
});
