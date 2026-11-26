import db from "../config/db.js";

// GET all users
export const getUsers = (req, res) => {
  db.query(
    `SELECT id, role_id, first_name, middle_name, last_name, birthdate, email, phone, photo_url
     FROM users WHERE id = ?`,
    [req.user.id],
    (err, results) => {
    if (err) { console.error("users:", err.code); return res.status(500).json({ error: "Server error" }); }
    res.json(results);
    }
  );
};

// GET user by ID
export const getUserById = (req, res) => {
  if (String(req.user.id) !== String(req.params.id)) {
    return res.status(403).json({ error: "You can only access your own user record" });
  }

  db.query(
    `SELECT id, role_id, first_name, middle_name, last_name, birthdate, email, phone, photo_url
     FROM users WHERE id = ?`,
    [req.params.id],
    (err, result) => {
      if (err) { console.error("users:", err.code); return res.status(500).json({ error: "Server error" }); }
      if (result.length === 0)
        return res.status(404).json({ error: "User not found" });
      res.json(result[0]);
    }
  );
};

// Create user
export const createUser = (req, res) => {
  return res.status(405).json({ error: "Use the registration endpoint to create an account" });
};

// Update user
export const updateUser = (req, res) => {
  if (String(req.user.id) !== String(req.params.id)) {
    return res.status(403).json({ error: "You can only update your own user record" });
  }

  const allowedFields = ["first_name", "middle_name", "last_name", "birthdate", "phone", "photo_url"];
  const updates = Object.fromEntries(
    allowedFields
      .filter((field) => Object.prototype.hasOwnProperty.call(req.body, field))
      .map((field) => [field, req.body[field]])
  );

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No editable fields provided" });
  }
  // Plain text only: an object here would be expanded into SQL by `SET ?`.
  if (Object.values(updates).some((value) => value !== null && typeof value === "object")) {
    return res.status(400).json({ error: "Fields must be text." });
  }
  // A photo is one of our own uploads (or an https image, e.g. from Google
  // sign-in), never a javascript: or data: URL.
  if (updates.photo_url && !/^(\/uploads\/[\w./-]+|https:\/\/[^\s"'<>]+)$/.test(String(updates.photo_url))) {
    return res.status(400).json({ error: "Invalid photo.", field: "photo_url" });
  }
  if (updates.birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(String(updates.birthdate))) {
    return res.status(400).json({ error: "Birthdate must be YYYY-MM-DD.", field: "birthdate" });
  }

  db.query(
    "UPDATE users SET ? WHERE id = ?",
    [updates, req.params.id],
    err => {
      if (err) {
        console.error("updateUser:", err.code);
        return res.status(500).json({ error: "Couldn't update your account." });
      }
      res.json({ message: "User updated" });
    }
  );
};

// Delete user
export const deleteUser = (req, res) => {
  if (String(req.user.id) !== String(req.params.id)) {
    return res.status(403).json({ error: "You can only delete your own user record" });
  }

  db.query("DELETE FROM users WHERE id = ?", [req.params.id], err => {
    if (err) { console.error("users:", err.code); return res.status(500).json({ error: "Server error" }); }
    res.json({ message: "User deleted" });
  });
};
