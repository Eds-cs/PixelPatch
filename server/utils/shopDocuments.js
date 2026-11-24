// utils/shopDocuments.js
// Proof-of-business documents a shop submits when it registers (AGENTS.md,
// "Business rules"). An admin checks them before approving the shop.
//
// Storage (tables already in the database, unused before 2026-11-24):
//   attachments                 one row per file (file_name, file_path, mime_type)
//   shop_documents              one row per submission (shop_id, status PENDING/SUCCESS/FAILED)
//   shop_documents_attachments  links them: attachment_id = attachments.id,
//                               shop_documents_id = shop_documents.id, type = a key below
//
// Files are private: they live under uploads/private/, which server.js never
// serves. Admins open them through a short-lived signed link instead.
import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";

export const DOCUMENT_TYPES = {
  BUSINESS_PERMIT: { label: "Business permit (Mayor's permit)", required: true },
  DTI_SEC_REGISTRATION: { label: "DTI or SEC registration", required: false },
  BIR_REGISTRATION: { label: "BIR certificate of registration (Form 2303)", required: false },
};

export const DOCUMENT_DIR = "uploads/private/shop-documents";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MIME_EXT = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" };

fs.mkdirSync(DOCUMENT_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DOCUMENT_DIR),
  // Random names: nothing about the applicant or the original file leaks into the path.
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${MIME_EXT[file.mimetype] ?? ""}`),
});

const documentUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: Object.keys(DOCUMENT_TYPES).length },
  fileFilter: (req, file, cb) => {
    if (!(file.fieldname in DOCUMENT_TYPES)) return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    if (!MIME_EXT[file.mimetype]) {
      return cb(Object.assign(new Error("Documents must be a PDF, JPG or PNG file."), { field: file.fieldname }));
    }
    cb(null, true);
  },
}).fields(Object.keys(DOCUMENT_TYPES).map((name) => ({ name, maxCount: 1 })));

/** Multer for the registration form, answering upload problems with a 400 { message }. */
export function uploadShopDocuments(req, res, next) {
  documentUpload(req, res, (err) => {
    if (!err) return next();
    removeUploadedFiles(req);
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Each document must be 10 MB or smaller."
        : err.code === "LIMIT_UNEXPECTED_FILE" || err.code === "LIMIT_FILE_COUNT"
        ? "Upload one file for each document."
        : err.message || "Couldn't read the uploaded documents.";
    // err.field is the document input (multer sets it for size errors).
    const field = err.field && err.field in DOCUMENT_TYPES ? `documents.${err.field}` : "documents";
    res.status(400).json({ success: false, message, field });
  });
}

/** The uploaded files as [{ type, file }] (multer's req.files is keyed by field). */
export function uploadedDocuments(req) {
  return Object.entries(req.files ?? {}).flatMap(([type, files]) => files.map((file) => ({ type, file })));
}

/** Deletes this request's uploads, e.g. after a validation error. */
export function removeUploadedFiles(req) {
  removeFiles(uploadedDocuments(req).map(({ file }) => file.path));
}

/** Deletes stored files; best effort, a missing file is fine. */
export function removeFiles(paths) {
  for (const p of paths) {
    if (p) fs.promises.unlink(p).catch(() => {});
  }
}

export const absoluteDocumentPath = (filePath) => path.resolve(filePath);

// ---------- signed view links ----------
// Not a JWT, so it can never be mistaken for a sign-in token.
const LINK_TTL_SECONDS = 5 * 60;
const linkKey = () => crypto.createHmac("sha256", String(process.env.JWT_SECRET)).update("shop-document-link").digest();
const signature = (payload) => crypto.createHmac("sha256", linkKey()).update(payload).digest("base64url");

export function signDocumentLink(attachmentId) {
  const payload = `${attachmentId}.${Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS}`;
  return `${payload}.${signature(payload)}`;
}

/** The attachment id a link grants, or null when it is invalid or expired. */
export function verifyDocumentLink(token) {
  const [id, expires, sig] = String(token ?? "").split(".");
  if (!id || !expires || !sig) return null;
  const expected = Buffer.from(signature(`${id}.${expires}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  if (Number(expires) < Date.now() / 1000) return null;
  const attachmentId = Number(id);
  return Number.isSafeInteger(attachmentId) && attachmentId > 0 ? attachmentId : null;
}
