"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  useSettingsStore,
  type InvoiceSignatureType,
} from "@/store/settings-store";
import {
  PenTool,
  Upload,
  Trash2,
  Image as ImageIcon,
  Check,
  FileSignature,
  ShieldCheck,
  Eye,
  Save,
  RotateCcw,
} from "lucide-react";

interface SignatureOption {
  type: InvoiceSignatureType;
  title: string;
  badge?: string;
  description: string;
  icon: typeof PenTool;
}

const SIGNATURE_OPTIONS: SignatureOption[] = [
  {
    type: "BLANK",
    title: "Blank Signature Box",
    badge: "Recommended for Physical Signing",
    description: "Leaves a clean box with a dashed guideline for physical ink signature and rubber stamp on printed invoices.",
    icon: PenTool,
  },
  {
    type: "CUSTOM",
    title: "Upload Custom Signature / Stamp",
    description: "Upload a photo of your signature or official rubber stamp to print automatically on invoices.",
    icon: Upload,
  },
  {
    type: "STYLIZED",
    title: "Stylized Digital Wave",
    description: "Prints a clean digital signature wave curve representing an electronic signature.",
    icon: FileSignature,
  },
  {
    type: "NONE",
    title: "No Signature Line",
    description: "Displays a 'Computer-generated invoice. No signature required.' notice instead of a signature box.",
    icon: ShieldCheck,
  },
];

export function InvoiceSettingsPanel() {
  const {
    invoiceSignatureType,
    invoiceSignatureUrl,
    invoiceSignatoryTitle,
    invoiceSignatoryName,
    businessName,
    setInvoiceSettings,
  } = useSettingsStore();

  const [signatureType, setSignatureType] = useState<InvoiceSignatureType>(invoiceSignatureType || "BLANK");
  const [signatureUrl, setSignatureUrl] = useState<string>(invoiceSignatureUrl || "");
  const [signatoryTitle, setSignatoryTitle] = useState<string>(invoiceSignatoryTitle || "Authorized Signatory");
  const [signatoryName, setSignatoryName] = useState<string>(invoiceSignatoryName || "");
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync from store when store updates
  useEffect(() => {
    setSignatureType(invoiceSignatureType || "BLANK");
    setSignatureUrl(invoiceSignatureUrl || "");
    setSignatoryTitle(invoiceSignatoryTitle || "Authorized Signatory");
    setSignatoryName(invoiceSignatoryName || "");
  }, [invoiceSignatureType, invoiceSignatureUrl, invoiceSignatoryTitle, invoiceSignatoryName]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    // Limit to 2MB to keep payload reasonable
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSignatureUrl(result);
      setSignatureType("CUSTOM");
      toast.success("Signature image uploaded successfully");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomSignature = () => {
    setSignatureUrl("");
    if (signatureType === "CUSTOM") {
      setSignatureType("BLANK");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("Signature image removed.");
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      setInvoiceSettings({
        invoiceSignatureType: signatureType,
        invoiceSignatureUrl: signatureUrl,
        invoiceSignatoryTitle: signatoryTitle.trim() || "Authorized Signatory",
        invoiceSignatoryName: signatoryName.trim(),
      });
      toast.success("Invoice settings updated successfully.");
    } catch {
      toast.error("Failed to update invoice settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSignatureType("BLANK");
    setSignatureUrl("");
    setSignatoryTitle("Authorized Signatory");
    setSignatoryName("");
    setInvoiceSettings({
      invoiceSignatureType: "BLANK",
      invoiceSignatureUrl: "",
      invoiceSignatoryTitle: "Authorized Signatory",
      invoiceSignatoryName: "",
    });
    toast.info("Invoice settings reset to default (Blank Box).");
  };

  const effectiveSignatoryName = signatoryName.trim() || businessName.trim() || "Authorized Signatory";
  const effectiveSignatoryTitle = signatoryTitle.trim() || "Authorized Signatory";

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-primary" />
                Invoice Signature Settings
              </CardTitle>
              <CardDescription>
                Configure the signature format and signatory details that appear on printed and PDF tax invoices.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset} className="h-8 text-xs">
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Signature Box Style</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SIGNATURE_OPTIONS.map((opt) => {
                const isSelected = signatureType === opt.type;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSignatureType(opt.type)}
                    className={cn(
                      "flex flex-col text-left p-4 rounded-xl border transition-all relative select-none",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                        : "border-border/70 hover:border-border hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center text-xs",
                            isSelected
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm">{opt.title}</span>
                      </div>
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {opt.description}
                    </p>
                    {opt.badge ? (
                      <span className="mt-2.5 inline-block text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md w-fit">
                        {opt.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upload Custom Signature (Active when CUSTOM is chosen) */}
          {signatureType === "CUSTOM" && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    Signature / Stamp Image
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Upload an image with a transparent or white background (PNG, JPG, max 2MB).
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {signatureUrl ? "Change Image" : "Upload Image"}
                </Button>
              </div>

              {signatureUrl ? (
                <div className="flex items-center gap-4 p-3 bg-background rounded-lg border">
                  <div className="w-36 h-16 bg-muted/30 rounded border border-dashed flex items-center justify-center p-1 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signatureUrl}
                      alt="Uploaded signature preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">Custom signature loaded</p>
                    <p className="text-[11px] text-muted-foreground">
                      Will render above the signatory title on all invoices.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCustomSignature}
                    className="text-destructive hover:text-destructive h-8 px-2"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-primary/30 rounded-lg p-6 text-center cursor-pointer hover:bg-background/80 transition-colors"
                >
                  <Upload className="w-8 h-8 text-primary/60 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Click to upload your signature or rubber stamp</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">PNG format with transparent background looks best</p>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Signatory Details & Live Preview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signatoryTitle" className="text-xs font-medium">
                  Signatory Designation / Title
                </Label>
                <Input
                  id="signatoryTitle"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  placeholder="e.g. Authorized Signatory, Proprietor, Manager"
                  className="h-9 text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Text displayed right below the signature line (default: &quot;Authorized Signatory&quot;).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signatoryName" className="text-xs font-medium">
                  Signatory Entity / Person Name
                </Label>
                <Input
                  id="signatoryName"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder={`Leave blank to use Business Name (${businessName || "MY DETAIL OS"})`}
                  className="h-9 text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Entity or person name displayed on the bottom line. Defaults to your Business Name.
                </p>
              </div>
            </div>

            {/* Live Invoice Preview */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Eye className="w-3.5 h-3.5" />
                Live Invoice Box Preview
              </Label>
              <div className="rounded-xl border border-border/80 bg-neutral-50 dark:bg-neutral-900/40 p-4 flex flex-col items-center justify-center min-h-[160px]">
                {/* Replicates invoice container in tax-invoice-format.ts */}
                <div className="w-full max-w-[220px] bg-white text-neutral-900 border border-neutral-300 rounded p-3 text-center shadow-sm">
                  {signatureType === "CUSTOM" && signatureUrl ? (
                    <div className="h-10 flex items-center justify-center mb-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={signatureUrl}
                        alt="Signature preview"
                        className="max-h-9 max-w-[130px] object-contain"
                      />
                    </div>
                  ) : signatureType === "STYLIZED" ? (
                    <div className="h-10 flex items-center justify-center mb-1">
                      <svg width="120" height="36" viewBox="0 0 120 40">
                        <path
                          d="M 15 28 C 35 12, 45 4, 55 18 C 65 32, 70 36, 85 14 C 95 6, 105 14, 100 26 C 95 34, 110 20, 115 18"
                          fill="none"
                          stroke="#0b1329"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  ) : signatureType === "NONE" ? (
                    <div className="min-h-[38px] flex items-center justify-center text-center mb-1 px-1">
                      <span className="text-[8px] text-neutral-500 italic leading-tight">
                        Computer-generated invoice. No signature required.
                      </span>
                    </div>
                  ) : (
                    /* BLANK (Clean box for physical stamp / signature) */
                    <div className="h-10 w-full flex flex-col justify-end items-center mb-1">
                      <div className="w-[85%] border-b border-dashed border-neutral-400 h-px" />
                    </div>
                  )}

                  <div className="text-[8px] font-bold uppercase tracking-wider text-neutral-500">
                    {effectiveSignatoryTitle}
                  </div>
                  <div className="text-[9px] font-bold text-neutral-900 mt-0.5 truncate">
                    {effectiveSignatoryName}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 text-center">
                  This signature card appears on the bottom right of all invoices.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="min-w-[140px]">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
