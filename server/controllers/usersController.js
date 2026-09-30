import db from "../config/db.js";

// GET all users
export const getUsers = (req, res) => {
  db.query(
    `SELECT id, role_id, first_name, middle_name, last_name, birthdate, email, phone, photo_url
     FROM users WHERE id = ?`,
    [req.user.id],
    (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
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
      if (err) return res.status(500).json({ error: err.message });
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

  db.query(
    "UPDATE users SET ? WHERE id = ?",
    [updates, req.params.id],
    err => {
      if (err) return res.status(500).json({ error: err.message });
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
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "User deleted" });
  });
};
