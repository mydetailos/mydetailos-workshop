import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPickupDropStore, usePickupDropStore } from "./pickup-drop-store";
import { useBranchStore } from "@/store/branch-store";
import type { Branch, PickupDropRequest } from "@/types";

const mockSnapshot = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/collection-sync", () => ({
  postCollectionSnapshot: (...args: unknown[]) => mockSnapshot(...args),
}));

describe("pickupDropStore isolation & snapshot safety", () => {
  beforeEach(() => {
    resetPickupDropStore();
    mockSnapshot.mockClear();
    useBranchStore.setState({
      branches: [
        { id: "branch-prime-1", name: "Prime Main", address: "123 St" } as Branch,
      ],
    });
  });

  it("generates unique IDs across requests that include a random suffix", () => {
    const store = usePickupDropStore.getState();
    const r1 = store.addRequest({
      jobCardId: "jc-1",
      jobNumber: "JC-001",
      branchId: "branch-prime-1",
      customerName: "Alice",
      address: "123 Main St",
      scheduledTime: new Date().toISOString(),
      type: "PICKUP",
    });

    const r2 = store.addRequest({
      jobCardId: "jc-2",
      jobNumber: "JC-002",
      branchId: "branch-prime-1",
      customerName: "Bob",
      address: "456 Side St",
      scheduledTime: new Date().toISOString(),
      type: "DROP",
    });

    expect(r1.id).toMatch(/^PND-2026-0001-[a-z0-9]+$/);
    expect(r2.id).toMatch(/^PND-2026-0002-[a-z0-9]+$/);
    expect(r1.id).not.toBe(r2.id);
  });

  it("setRequestsFromBootstrap replaces requests and filters out foreign branch IDs", () => {
    const foreignRequest = {
      id: "PND-2026-0003",
      jobCardId: "jc-foreign",
      jobNumber: "JC-999",
      branchId: "branch-test-new-1", // Belongs to a different organization
      customerName: "Charlie",
      address: "Far Away",
      scheduledTime: new Date().toISOString(),
      type: "PICKUP",
      status: "PICKED_UP",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as PickupDropRequest;

    const validRequest = {
      id: "PND-2026-0001-a1b2c3",
      jobCardId: "jc-valid",
      jobNumber: "JC-001",
      branchId: "branch-prime-1",
      customerName: "Dave",
      address: "Prime Workshop",
      scheduledTime: new Date().toISOString(),
      type: "PICKUP",
      status: "IN_SERVICE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as PickupDropRequest;

    // Load server items containing a foreign item and valid item
    usePickupDropStore.getState().setRequestsFromBootstrap([validRequest, foreignRequest]);

    const state = usePickupDropStore.getState();
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0].id).toBe("PND-2026-0001-a1b2c3");
    expect(state.hydrated).toBe(true);
  });

  it("does not leak previous local requests across setRequestsFromBootstrap", () => {
    // Simulate leftover local request from another tenant
    usePickupDropStore.setState({
      requests: [
        {
          id: "PND-2026-0099",
          jobCardId: "jc-old",
          jobNumber: "JC-OLD",
          branchId: "branch-prime-1",
          customerName: "Old",
          address: "Old St",
          scheduledTime: new Date().toISOString(),
          type: "PICKUP",
          status: "PENDING",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as PickupDropRequest,
      ],
      hydrated: true,
    });

    // Server responds with empty list for this tenant
    usePickupDropStore.getState().setRequestsFromBootstrap([]);

    expect(usePickupDropStore.getState().requests).toHaveLength(0);
  });

  it("resetPickupDropStore clears all requests and resets hydrated flag", () => {
    usePickupDropStore.setState({
      requests: [{ id: "PND-1" } as PickupDropRequest],
      hydrated: true,
      writesBlocked: true,
    });

    resetPickupDropStore();

    const state = usePickupDropStore.getState();
    expect(state.requests).toEqual([]);
    expect(state.hydrated).toBe(false);
    expect(state.writesBlocked).toBe(false);
  });
});
