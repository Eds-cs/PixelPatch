import db from "../config/db.js";
import jwt from "jsonwebtoken";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/*
  Google issues a separate OAuth client ID per platform (web, iOS, Android),
  and an ID token's `aud` claim is whichever ID requested it. Verifying against
  a single ID therefore rejects every sign-in from the mobile apps.
  GOOGLE_CLIENT_IDS accepts a comma-separated allow-list; verification stays
  strict, it just recognises this project's other clients.
  Falls back to GOOGLE_CLIENT_ID when unset, so existing setups are unchanged.
*/
const GOOGLE_AUDIENCES = (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

/* =====================================
                REGISTER
====================================== */
export const register = async (req, res) => {
  try {
    const {
      first_name,
      middle_name,
      last_name,
      birthdate,
      email,
      phone,
      password,
      photo_url
    } = req.body;

    const hashedPassword = await hashPassword(password);

    const sql = `
      INSERT INTO users 
      (role_id, first_name, middle_name, last_name, birthdate, email, phone, password_hash, photo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        1,
        first_name,
        middle_name,
        last_name,
        birthdate,
        email,
        phone,
        hashedPassword,
        photo_url || null,
      ],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({ 
          message: "Registration successful", 
          user_id: result.insertId 
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =====================================
                  LOGIN
====================================== */

export const generateTestHash = async (req, res) => {
  try {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("password123", 10);

    res.json({ hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Hash generation failed" });
  }
};

export const login = (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      if (result.length === 0)
        return res.status(400).json({ error: "Email not found" });

      const user = result[0];

      const isMatch = await comparePassword(password, user.password_hash);
      if (!isMatch)
        return res.status(400).json({ error: "Invalid credentials" });

      const token = jwt.sign(
        { id: user.id, role_id: user.role_id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          role_id: user.role_id,
          first_name: user.first_name,
          middle_name: user.middle_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          photo_url: user.photo_url,
        }
      });
    }
  );
};


/* =====================================
             GOOGLE LOGIN
====================================== */
export const googleLogin = async (req, res) => {
  const { credential } = req.body;

  try {
    // Validate Google Token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_AUDIENCES,
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    // Check if user already exists
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      let user = result[0];

      if (!user) {
        // Auto-create account for Google login
        const insertSql = `
          INSERT INTO users (email, first_name, last_name, photo_url, role_id)
          VALUES (?, ?, ?, ?, 1)
        `;

        const values = [
          email,
          payload.given_name || "",
          payload.family_name || "",
          payload.picture || null
        ];

        const insertResult = await new Promise((resolve, reject) => {
          db.query(insertSql, values, (err2, result2) => {
            if (err2) return reject(err2);
            resolve(result2);
          });
        });

        // Attach created user info
        user = {
          id: insertResult.insertId,
          email,
          first_name: payload.given_name,
          last_name: payload.family_name,
          photo_url: payload.picture,
          role_id: 1
        };
      }

      // Generate token
      const token = jwt.sign(
        { id: user.id, role_id: user.role_id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        message: "Google Login successful",
        token,
        user,
      });
    });

  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);
    res.status(400).json({ error: "Invalid Google token" });
  }
};
