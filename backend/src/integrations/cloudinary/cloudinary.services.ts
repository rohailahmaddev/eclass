import { ApiError } from "../../error/apiError.js";
import { createLogger } from "../../logger/logger.js"
import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import { cloudinary } from "./cloudinary.js";
import { StoredImage } from "./cloudinary.type.js";

const logger = createLogger("cloudinaryServices");

const AVATAR_FOLDER = "eclass/avatars";
const UPLOAD_TIMEOUT_MS = 30_000;

export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageError";
  }
}

/* ----------------------------- retry helper ----------------------------- */

/** Network blips, timeouts (499) and Cloudinary 5xx are worth retrying; 4xx never are. */
const isTransient = (err: unknown): boolean => {
  const { http_code: httpCode, code } = err as { http_code?: number; code?: string };
  if (httpCode !== undefined && (httpCode >= 500 || httpCode === 499)) return true;
  return ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ECONNREFUSED"].includes(code ?? "");
};

const withRetry = async <T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 300): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === attempts || !isTransient(err)) break;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      logger.warn({ err, attempt }, "cloudinary call failed, retrying");
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

/* -------------------------------- upload -------------------------------- */

const uploadBuffer = (buffer: Buffer, options: UploadApiOptions): Promise<UploadApiResponse> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", timeout: UPLOAD_TIMEOUT_MS, ...options },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Empty Cloudinary response"));
        resolve(result);
      },
    );
    stream.end(buffer);
  });

const toStoredImage = (r: UploadApiResponse): StoredImage => ({
  publicId: r.public_id,
  url: r.secure_url,
  width: r.width,
  height: r.height,
  bytes: r.bytes,
  format: r.format,
});

export const uploadAvatar = async (buffer: Buffer): Promise<StoredImage> => {
  try {
    const result = await withRetry(() =>
      uploadBuffer(buffer, {
        folder: AVATAR_FOLDER,
        // public_id: `user-${userId}`,
        overwrite: true,
        invalidate: true, // purge CDN cache of the previous version
        allowed_formats: ["jpg", "jpeg", "png", "webp"], // enforced server-side by Cloudinary
        transformation: [
          { width: 512, height: 512, crop: "fill", gravity: "auto" },
          { quality: "auto", fetch_format: "auto" },
        ],
      }),
    );
    logger.info({ publicId: result.public_id, bytes: result.bytes }, "avatar uploaded");
    return toStoredImage(result);
  } catch (err) {
    logger.error({ err }, "avatar upload failed");
    throw new StorageError("Could not upload image", { cause: err });
  }
};

/* -------------------------------- delete -------------------------------- */

/**
 * Delete an image by public_id. Idempotent: deleting something that is already
 * gone counts as success, so retries and double-clicks are safe.
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    const { result } = await withRetry(() =>
      cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true }),
    );
    if (result !== "ok" && result !== "not found") {
      throw new Error(`Unexpected Cloudinary destroy result: ${result}`);
    }
    logger.info({ publicId, result }, "image deleted");
  } catch (err) {
    logger.error({ err, publicId }, "image delete failed");
    throw new StorageError("Could not delete image", { cause: err });
  }
};

/**
 * Fallback for rows that only stored the URL. Prefer storing publicId in the DB.
 * Works for URLs of the form .../image/upload/[v123/]folder/name.ext (no transformations).
 */
export const publicIdFromUrl = (url: string): string | null => {
  const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+(?:\?.*)?$/i);
  return match?.[1] ?? null;
};

/* ------------------------------ delivery URL ----------------------------- */

/** Build an optimized delivery URL on the fly (auto format + quality, smart crop). */
export const imageUrl = (publicId: string, size = 128): string =>
  cloudinary.url(publicId, {
    width: size,
    height: size,
    crop: "fill",
    gravity: "auto",
    fetch_format: "auto",
    quality: "auto",
    secure: true,
  });
