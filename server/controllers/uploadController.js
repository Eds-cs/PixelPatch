// controllers/uploadController.js
// POST /api/upload/photo: a signed-in user uploads one photo ("photo").
// The Expo app doesn't use it (it sends photos with the request or device
// form); it remains for the older web app. Same checks as every photo
// upload (middleware/upload.js): signed in, real PNG/JPEG only.
import { upload as imageUpload } from "../middleware/upload.js";

export const upload = imageUpload.single("photo");

export const uploadPhoto = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Relative path, like the other upload routes. The frontend resolves it
  // against the API host with lib/api.js mediaUrl().
  const fileUrl = `/uploads/requests/${req.file.filename}`;

  return res.json({
    message: "Upload successful!",
    url: fileUrl,
  });
};
