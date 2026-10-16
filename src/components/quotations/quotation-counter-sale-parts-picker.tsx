"use client";

import { useMemo, useState } from "react";
import { Minus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInventoryStore } from "@/store/inventory-store";
import { formatCurrency } from "@/lib/utils";
import { catalogForCounterSale } from "@/lib/counter-sale";
import {
  getSelectableUnits,
  getUnitPrice,
  partMatchesInventorySearch,
} from "@/lib/inventory/multi-unit";
import type { QuotationPartLine } from "@/types";
import { MAX_QUOTATION_PART_QTY } from "@/lib/quotation-limits";
import { toast } from "sonner";

export function quotationPartLineTotal(line: Pick<QuotationPartLine, "quantity" | "unitPrice">): number {
  return Math.round(line.quantity * line.unitPrice * 100) / 100;
}

export function quotationPartsSubtotal(lines: QuotationPartLine[]): number {
  return Math.round(lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100;
}

export function QuotationCounterSalePartsPicker({
  lines,
  onLinesChange,
  title = "Counter Sale",
}: {
  lines: QuotationPartLine[];
  onLinesChange: (lines: QuotationPartLine[]) => void;
  title?: string;
}) {
  const parts = useInventoryStore((s) => s.parts);
  const [partSearch, setPartSearch] = useState("");
  const [catalogueUnits, setCatalogueUnits] = useState<Record<string, string>>({});
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [priceDraft, setPriceDraft] = useState("");

  const eligibleParts = useMemo(
    () => catalogForCounterSale(parts).filter((p) => partMatchesInventorySearch(p, partSearch)),
    [parts, partSearch]
  );

  const commitCustomPrice = (index: number) => {
    const line = lines[index];
    if (!line) return;
    const n = Number.parseFloat(priceDraft.replace(/,/g, "").trim());
    const part = parts.find((p) => p.id === line.partId);
    const catalogPrice = line.catalogPrice ?? (part ? getUnitPrice(part, line.unit) : line.unitPrice);
    const newPrice = Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : catalogPrice;
    const isCustomPrice = Math.abs(newPrice - catalogPrice) > 0.005;
    onLinesChange(
      lines.map((l, i) =>
        i === index
          ? {
              ...l,
              unitPrice: newPrice,
              catalogPrice,
              isCustomPrice,
              lineTotal: quotationPartLineTotal({ quantity: l.quantity, unitPrice: newPrice }),
            }
          : l
      )
    );
    setEditingPriceIndex(null);
  };

  const addPart = (partId: string) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;
    const unit = catalogueUnits[partId] ?? getSelectableUnits(part)[0] ?? part.primaryUnit;
    const catalogPrice = getUnitPrice(part, unit);
    const existingIndex = lines.findIndex((line) => line.partId === partId && line.unit === unit);
    if (existingIndex >= 0) {
      const existing = lines[existingIndex]!;
      if (existing.quantity >= MAX_QUOTATION_PART_QTY) {
        toast.error(`Maximum ${MAX_QUOTATION_PART_QTY} per part on a quotation`);
        return;
      }
      onLinesChange(
        lines.map((line, i) =>
          i === existingIndex
            ? {
                ...line,
                quantity: line.quantity + 1,
                lineTotal: quotationPartLineTotal({ quantity: line.quantity + 1, unitPrice: line.unitPrice }),
              }
            : line
        )
      );
      return;
    }
    onLinesChange([
      ...lines,
      {
        partId: part.id,
        name: part.name,
        sku: part.sku,
        quantity: 1,
        unit,
        unitPrice: catalogPrice,
        catalogPrice,
        isCustomPrice: false,
        lineTotal: catalogPrice,
      },
    ]);
  };

  const updateQuantity = (index: number, nextQty: number) => {
    const line = lines[index];
    if (!line) return;
    if (nextQty > MAX_QUOTATION_PART_QTY) {
      toast.error(`Maximum ${MAX_QUOTATION_PART_QTY} per part on a quotation`);
      return;
    }
    const qty = Math.max(1, nextQty);
    onLinesChange(
      lines.map((line, i) =>
        i === index
          ? {
              ...line,
              quantity: qty,
              lineTotal: quotationPartLineTotal({ quantity: qty, unitPrice: line.unitPrice }),
            }
          : line
      )
    );
  };

  const removeLine = (index: number) => {
    if (editingPriceIndex === index) {
      setEditingPriceIndex(null);
    } else if (editingPriceIndex != null && editingPriceIndex > index) {
      setEditingPriceIndex(editingPriceIndex - 1);
    }
    onLinesChange(lines.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/10">
      <div className="space-y-1">
        <Label className="text-sm font-semibold">{title}</Label>
        <p className="text-xs text-muted-foreground">
          Optional. Add Direct Sale parts to include in this estimate (max {MAX_QUOTATION_PART_QTY} per part).
        </p>
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Parts catalogue</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search parts by name or SKU..."
            value={partSearch}
            onChange={(e) => setPartSearch(e.target.value)}
          />
        </div>
        <div className="rounded-lg border border-border max-h-48 overflow-y-auto divide-y">
          {eligibleParts.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">
              No Counter Sale parts. Enable Direct Sale on a catalog item.
            </p>
          ) : (
            eligibleParts.map((part) => {
              const units = getSelectableUnits(part);
              const selectedUnit = catalogueUnits[part.id] ?? units[0] ?? part.primaryUnit;
              const price = getUnitPrice(part, selectedUnit);
              const existingLine = lines.find(
                (line) => line.partId === part.id && line.unit === selectedUnit
              );
              const atQtyLimit = (existingLine?.quantity ?? 0) >= MAX_QUOTATION_PART_QTY;
              return (
                <div key={part.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{part.name}</p>
                    <p className="text-xs text-muted-foreground">{part.sku}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium tabular-nums">{formatCurrency(price)}</span>
                    {units.length > 1 && (
                      <Select
                        value={selectedUnit}
                        onValueChange={(unit) =>
                          setCatalogueUnits((prev) => ({ ...prev, [part.id]: unit }))
                        }
                      >
                        <SelectTrigger className="h-8 w-[88px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={atQtyLimit}
                      onClick={() => addPart(part.id)}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {lines.length > 0 && (
        <div className="space-y-2">
          <Label>Selected parts</Label>
          <ul className="rounded-lg border border-border divide-y">
            {lines.map((line, index) => (
              <li key={`${line.partId}-${line.unit}-${index}`} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{line.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {line.sku} · {line.unit}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(index, line.quantity - 1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-8 text-center text-sm tabular-nums">{line.quantity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={line.quantity >= MAX_QUOTATION_PART_QTY}
                    onClick={() => updateQuantity(index, line.quantity + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="text-right shrink-0 min-w-[110px]">
                  {editingPriceIndex === index ? (
                    <div className="flex items-center gap-1.5 justify-end">
                      <Label className="text-[11px] text-muted-foreground shrink-0">₹/unit</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="h-7 w-20 text-xs tabular-nums text-right"
                        value={priceDraft}
                        autoFocus
                        onChange={(e) => setPriceDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitCustomPrice(index);
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setEditingPriceIndex(null);
                          }
                        }}
                        onBlur={() => commitCustomPrice(index)}
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(line.lineTotal)}
                      </p>
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          @ {formatCurrency(line.unitPrice)}/{line.unit}
                        </span>
                        {line.isCustomPrice && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1 rounded">
                            custom
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setPriceDraft(String(line.unitPrice));
                            setEditingPriceIndex(index);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeLine(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
