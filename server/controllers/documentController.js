// controllers/documentController.js
import db from "../config/db.js";

export const getShopDocuments = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      sda.attachment_id,
      sda.type,
      a.file_name,
      a.file_path,
      a.mime_type
    FROM shop_documents_attachments sda
    LEFT JOIN attachments a ON a.id = sda.attachment_id
    WHERE sda.shop_documents_id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching documents:", err);
      return res.status(500).json({ error: "Server error fetching documents" });
    }

    res.json({ documents: results });
  });
};
