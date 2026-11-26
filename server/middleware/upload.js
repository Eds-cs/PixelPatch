// middleware/upload.js
// Photo uploads (repair requests, devices, profile photo). Only real PNG and
// JPEG images are kept:
//   * the claimed type must be PNG or JPEG (fileFilter),
//   * the saved extension comes from that type, never from the uploader's
//     file name (so nothing can be saved as .html, .svg or .js),
//   * after saving, the file's first bytes must really be a PNG or JPEG
//     (requireFileTypes); otherwise every file of the request is deleted.
// upload.single(...) and upload.array(...) return [multer, check], which
// Express accepts anywhere a middleware goes.
import multer from "multer";
import crypto from "crypto";
import { requireFileTypes } from "../utils/fileSignatures.js";

const IMAGE_EXT = { "image/png": ".png", "image/jpeg": ".jpg", "image/jpg": ".jpg" };
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_ONLY_MESSAGE = "Photos must be PNG or JPEG images, up to 10 MB each.";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/requests/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${IMAGE_EXT[file.mimetype]}`),
});

const images = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES, files: 10 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_EXT[file.mimetype]) cb(null, true);
    else cb(Object.assign(new Error(IMAGE_ONLY_MESSAGE), { status: 400, code: "INVALID_FILE" }), false);
  },
});

const checkImages = requireFileTypes(["image/png", "image/jpeg"], IMAGE_ONLY_MESSAGE);

export const upload = {
  single: (field) => [images.single(field), checkImages],
  array: (field, maxCount) => [images.array(field, maxCount), checkImages],
};
