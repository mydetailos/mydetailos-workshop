import { apiGet, apiPostForm, ApiError } from "./api-client";
import {
  mergeInspectionPhotosById,
  toInspectionPhotoUploadQueryType,
  type InspectionPhotoKind,
} from "@/lib/job-card-inspection-photos";
import type { JobCard } from "@/types";
import { useJobCardStore } from "@/store/job-card-store";

export const INSPECTION_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Session-level registry of job card IDs that completed Vehicle Check-In with
 * at least one before photo in the current browser session.
 *
 * This is a plain in-memory Set — no Zustand, no server round-trip.  It is set
 * immediately when check-in succeeds and survives all store/domain-loader races
 * until the user closes the tab or refreshes the page.
 *
 * The INSPECTION → In Service validation reads this first; if the ID is here
 * the before-photo requirement is already satisfied and no network call is
 * needed.
 */
const _checkedInJobIds = new Set<string>();

export function markJobCardCheckedIn(jobCardId: string): void {
  _checkedInJobIds.add(jobCardId);
}

export function isJobCardCheckedIn(jobCardId: string): boolean {
  return _checkedInJobIds.has(jobCardId);
}

/**
 * Compresses and downscales an image file in the browser before network upload.
 * Reduces raw 5MB–12MB smartphone camera photos to ~150KB–250KB, accelerating upload by 10x–30x.
 */
export async function compressImageForUpload(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/") || file.size <= 250 * 1024) {
    return file;
  }
  if (file.type === "image/gif") return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (!width || !height) {
        resolve(file);
        return;
      }

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Upload one inspection photo; returns persisted URL/path stored on `InspectionPhoto.url`.
 * Automatically compresses raw camera files client-side before upload.
 * `kind` is normalized; the HTTP query uses uppercase for the backend contract.
 */
export async function uploadJobInspectionPhoto(
  jobCardId: string,
  kind: InspectionPhotoKind | "BEFORE" | "AFTER",
  file: File,
  photoId: string
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file (JPEG, PNG, WebP, or GIF).");
  }
  const readyFile = await compressImageForUpload(file);
  if (readyFile.size > INSPECTION_PHOTO_MAX_BYTES) {
    throw new Error("Each photo must be 10 MB or smaller.");
  }
  const normalized = kind === "AFTER" || kind === "after" ? "after" : "before";
  const fd = new FormData();
  fd.append("photo", readyFile);
  const q = new URLSearchParams({
    type: toInspectionPhotoUploadQueryType(normalized),
    photoId: photoId.slice(0, 96),
  });
  const data = await apiPostForm<{ url: string }>(
    `/api/job-cards/${encodeURIComponent(jobCardId)}/photos?${q.toString()}`,
    fd
  );
  return data.url;
}

/**
 * Re-fetch job cards from the API and sync the matching card into the store.
 * Used before Inspection → In Service so validation reads persisted photos.
 *
 * IMPORTANT: Inspection photos are MERGED (local wins by photo ID) so that a
 * stale server response (e.g. the background secureToken refresh that fires
 * right after addJobCard, before the check-in PUT completes) never wipes photos
 * that have already been saved locally or are already in the store.
 */
export async function refreshJobCardFromServer(jobCardId: string): Promise<JobCard | null> {
  let found: JobCard | null = null;
  try {
    const data = await apiGet<{ item: JobCard }>(`/api/job-cards/${encodeURIComponent(jobCardId)}`);
    found = data.item ?? null;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
  if (!found) return null;

  useJobCardStore.setState((state) => {
    const existing = state.jobCards.find((j) => j.id === jobCardId);
    const remotePhotos = found.inspectionPhotos ?? [];
    const localPhotos = existing?.inspectionPhotos ?? [];

    let merged: JobCard;
    if (localPhotos.length === 0) {
      merged = found;
    } else if (remotePhotos.length === 0) {
      // Server response predates the check-in PUT — keep all local photos.
      merged = { ...found, inspectionPhotos: localPhotos };
    } else {
      // Both sides have photos: union by id, remote metadata wins for shared ids.
      merged = {
        ...found,
        inspectionPhotos: mergeInspectionPhotosById(remotePhotos, localPhotos),
      };
    }

    if (!existing) {
      return { jobCards: [merged, ...state.jobCards] };
    }
    return {
      jobCards: state.jobCards.map((j) => (j.id === jobCardId ? merged : j)),
    };
  });

  // Return the merged version so callers (e.g. the INSPECTION → In Service
  // validation) see the authoritative photo list, not the bare server snapshot.
  return useJobCardStore.getState().jobCards.find((j) => j.id === jobCardId) ?? found;
}
