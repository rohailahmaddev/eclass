import type { NextFunction, Request, RequestHandler, Response } from "express";
import multer, { MulterError } from "multer";
import { ApiError } from "../error/apiError.js";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * The mimetype header is chosen by the client and can be faked.
 * Check the file's real signature (magic bytes) too. No dependency needed for 3 formats.
 */
const detectImageType = (buf: Buffer): "jpeg" | "png" | "webp" | null => {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";

  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }

  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  return null;
};

interface ImageUploadOptions {
  /** multipart field name the client must use */
  field: string;
  /** max file size in MB */
  maxMb: number;
  /** reject the request when no file is sent */
  required?: boolean;
}

export const imageUpload = ({ field, maxMb, required = false }: ImageUploadOptions): RequestHandler[] => {
  const maxBytes = maxMb * 1024 * 1024;

  const parser = multer({
    storage: multer.memoryStorage(), // file lives in req.file.buffer, nothing touches disk
    limits: {
      fileSize: maxBytes,
      files: 1,
      fields: 20, // text fields that may accompany the file
      parts: 21,
    },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
      cb(new ApiError(400, "Only JPG, PNG or WebP images are allowed"));
    },
  }).single(field);

  // 1) parse multipart and translate multer's errors into clean API errors
  const parse: RequestHandler = (req, res, next) => {
    parser(req, res, (err: unknown) => {
      if (!err) return next();

      if (err instanceof MulterError) {
        switch (err.code) {
          case "LIMIT_FILE_SIZE":
            return next(new ApiError(413, `Image must be ${maxMb} MB or smaller`));
          case "LIMIT_UNEXPECTED_FILE":
            return next(new ApiError(400, `Unexpected file field. Send the image as "${field}"`));
          default:
            return next(new ApiError(400, "Invalid upload request"));
        }
      }

      next(err); // ApiError from fileFilter, or an unexpected error for the error handler
    });
  };

  // 2) verify the real file type and enforce "required"
  const verify = (req: Request, _res: Response, next: NextFunction) => {
    if (!req.file) {
      return required ? next(new ApiError(400, `Please provide an image in "${field}"`)) : next();
    }

    if (!detectImageType(req.file.buffer)) {
      return next(new ApiError(400, "File is not a valid JPG, PNG or WebP image"));
    }

    next();
  };

  return [parse, verify];
};

/** 2 MB avatar, optional (e.g. registration). Use imageUpload({ ..., required: true }) when mandatory. */
export const avatarUpload = imageUpload({ field: "avatar", maxMb: 2 });
