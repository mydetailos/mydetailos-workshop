"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { cleanServiceName, isMembershipPricedLine } from "@/lib/service-line-price";
import type { ServiceItem } from "@/types";

export type MembershipUsageInfo = {
  included: number;
  used: number;
  remaining: number;
  isIncluded: boolean;
};

export interface JobCardHighEndChecklistItem {
  id: string;
  name: string;
  price: number;
  isCompleted: boolean;
  durationMinutes?: number;
}

export interface JobCardServiceChecklistProps {
  serviceItems: ServiceItem[];
  highEndItems?: JobCardHighEndChecklistItem[];
  progressPercent: number;
  completedCount: number;
  totalCount: number;
  canEdit: boolean;
  membershipUsageByCatalogId: Map<string, MembershipUsageInfo>;
  onToggleComplete: (serviceId: string) => void;
  onToggleHighEndComplete?: (highEndId: string) => void;
}

export function JobCardServiceChecklist({
  serviceItems,
  highEndItems,
  progressPercent,
  completedCount,
  totalCount,
  canEdit,
  membershipUsageByCatalogId,
  onToggleComplete,
  onToggleHighEndComplete,
}: JobCardServiceChecklistProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Service Checklist</CardTitle>
        <div className="flex items-center gap-4 mt-2">
          <Progress value={progressPercent} className="w-32 h-2" />
          <span className="text-sm text-muted-foreground">
            {completedCount} of {totalCount} completed
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {serviceItems.length === 0 && (!highEndItems || highEndItems.length === 0) && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No services on this job card yet. Add services from the job setup flow or create the job with at least one service.
            </p>
          )}
          {serviceItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={item.isCompleted}
                  disabled={!canEdit}
                  onCheckedChange={() => onToggleComplete(item.id)}
                />
                <div>
                  <p
                    className={`font-medium ${
                      item.isCompleted ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {cleanServiceName(item.name)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                    }).format(item.price)}
                  </p>
                  {isMembershipPricedLine(item) ? (
                    <div className="mt-0.5 space-y-0.5">
                      {item.membershipId ? (
                        <p className="font-mono text-xs text-muted-foreground">
                          Membership ID: {item.membershipId}
                        </p>
                      ) : null}
                      {membershipUsageByCatalogId.get(item.serviceCatalogId)?.isIncluded ? (
                        <p className="text-xs text-muted-foreground">
                          Included: {membershipUsageByCatalogId.get(item.serviceCatalogId)!.included} · Used:{" "}
                          {membershipUsageByCatalogId.get(item.serviceCatalogId)!.used} · Remaining:{" "}
                          {membershipUsageByCatalogId.get(item.serviceCatalogId)!.remaining}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {item.durationMinutes != null && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Est. {item.durationMinutes} min
                    </p>
                  )}
                </div>
              </div>
              {item.isCompleted && (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Done
                </span>
              )}
            </div>
          ))}

          {highEndItems && highEndItems.length > 0 && (
            <div className="space-y-3 pt-2">
              {serviceItems.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Premium &amp; High-End Services</span>
                </div>
              )}
              {highEndItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-amber-500/25 bg-amber-500/5 dark:bg-amber-950/15"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={item.isCompleted}
                      disabled={!canEdit}
                      onCheckedChange={() => onToggleHighEndComplete?.(item.id)}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-medium ${
                            item.isCompleted ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {cleanServiceName(item.name)}
                        </p>
                        <Badge
                          variant="secondary"
                          className="text-[10px] py-0 px-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        >
                          High-End
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                        }).format(item.price)}
                      </p>
                      {item.durationMinutes != null && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Est. {item.durationMinutes} min
                        </p>
                      )}
                    </div>
                  </div>
                  {item.isCompleted && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      Done
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
