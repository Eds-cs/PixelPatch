// server/utils/fileSignatures.js
// Checks what an uploaded file really is from its first bytes, instead of
// trusting the type or file name the uploader sent (both are easy to fake:
// an "image/png" that is really an HTML page would run as a web page on the
// site's own address and could read a signed-in visitor's token).
import fs from "fs";

const SIGNATURES = {
  "image/png": (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  "image/jpeg": (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "application/pdf": (b) => b.length >= 5 && b.toString("latin1", 0, 5) === "%PDF-",
};
SIGNATURES["image/jpg"] = SIGNATURES["image/jpeg"];

/** The real type of the file at `filePath` among `allowed` types, or null. */
export function detectType(filePath, allowed) {
  let fd;
  try {
    fd = fs.openSync(filePath, "r");
    const head = Buffer.alloc(16);
    const read = fs.readSync(fd, head, 0, head.length, 0);
    const bytes = head.subarray(0, read);
    return allowed.find((type) => SIGNATURES[type]?.(bytes)) ?? null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

/** Every file multer stored for this request (single, array or fields). */
export function uploadedFiles(req) {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === "object") return Object.values(req.files).flat();
  return [];
}

export function removeUploadedFiles(req) {
  for (const file of uploadedFiles(req)) {
    try { fs.unlinkSync(file.path); } catch { /* already gone */ }
  }
}

/**
 * Express middleware for after multer: every uploaded file must really be one
 * of `allowed` (by content). Otherwise all of the request's files are deleted
 * and the request gets a 400.
 */
export const requireFileTypes = (allowed, message) => (req, res, next) => {
  // Only the content counts. (A real JPEG that a phone labelled image/png is
  // kept; it's still an image, and /uploads is served with nosniff.)
  const bad = uploadedFiles(req).some((file) => !detectType(file.path, allowed));
  if (!bad) return next();
  removeUploadedFiles(req);
  return res.status(400).json({ error: message, message, code: "INVALID_FILE" });
};
