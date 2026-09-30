// controllers/uploadController.js
import multer from "multer";
import path from "path";

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // unique filename
  },
});

export const upload = multer({ storage }).single("photo");

export const uploadPhoto = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileUrl = `${import.meta.env.VITE_API_URL}/uploads/${req.file.filename}`;

  return res.json({
    message: "Upload successful!",
    url: fileUrl,
  });
};
