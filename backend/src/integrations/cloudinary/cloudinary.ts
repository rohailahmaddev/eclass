import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env.js";

const required = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

// Fail fast at startup instead of on the first user upload.
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing Cloudinary env vars: ${missing.join(", ")}`);
}

cloudinary.config({
  cloud_name: env.CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true, // always generate https URLs
});

export { cloudinary };
