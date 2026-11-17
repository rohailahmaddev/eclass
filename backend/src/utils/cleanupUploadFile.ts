import type { Request } from "express";
import fs from "node:fs";
import { createLogger } from "../logger/logger.js";

const logger = createLogger("cleanupUploadFile")

/**
 * Remove files multer already wrote to disk when the request turns out to be invalid.
 * Handles upload.single(), upload.array() and upload.fields().
 * Fire-and-forget: a cleanup failure must never change the HTTP response.
 */

export const cleanupUploadedFiles = (req: Request): void => {
  type UploadedFile = { path?: string };
  const { file, files } = req as Request & {
    file?: UploadedFile;
    files?: UploadedFile[] | Record<string, UploadedFile[]>;
  };

  const all: UploadedFile[] = [];
  if (file) all.push(file);
  if (Array.isArray(files)) all.push(...files);
  else if (files) all.push(...Object.values(files).flat());

  for (const f of all) {
    if (!f.path) continue;
    fs.unlink(f.path, (err) => {
      if (err && err.code !== "ENOENT") {
        // Swap for your logger (pino/winston) in a real project.
        logger.error(
          { err, filePath: f.path },
         "Failed to remove uploaded file"
        );
      }
    });
  }
};
