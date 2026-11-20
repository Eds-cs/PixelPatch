import { randomUUID } from "crypto";
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

/*
  Accepts "YYYY-MM-DD" for a real calendar day between 1900 and today.
  Returns the normalized string, or null when it is missing or invalid.
*/
const parseBirthdate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDay =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isRealDay || year < 1900 || date > new Date()) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
};

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

    if (
      !String(first_name ?? "").trim() ||
      !String(last_name ?? "").trim() ||
      !String(email ?? "").trim() ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        error: "First name, last name, email and a password of at least 8 characters are required",
      });
    }

    const validBirthdate = parseBirthdate(birthdate);
    if (!validBirthdate) {
      return res.status(400).json({ error: "Please enter a valid birthday." });
    }

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
        String(first_name).trim(),
        // Optional: not everyone has a middle name.
        String(middle_name ?? "").trim() || null,
        String(last_name).trim(),
        // Required for app signups. The column stays nullable because Google
        // sign-in and older accounts have no birthdate.
        validBirthdate,
        String(email).trim(),
        String(phone ?? "").trim() || null,
        hashedPassword,
        photo_url || null,
      ],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "An account with this email already exists" });
          }
          console.error("register error:", { code: err.code });
          return res.status(500).json({ error: "Registration failed. Please try again." });
        }

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

// A bcrypt hash of a random throwaway password, compared against when the email
// has no account so that path takes as long as a real password check.
const dummyPasswordHash = hashPassword(randomUUID());

export const login = (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      // One message for an unknown email and a wrong password, and a password
      // check either way, so neither the reply nor its timing reveals which
      // emails have accounts.
      // Accounts created with Google may have no usable password hash.
      const user = result[0];
      const hasPassword = /^\$2[aby]\$/.test(String(user?.password_hash ?? ""));
      const isMatch = await comparePassword(
        typeof password === "string" ? password : "",
        hasPassword ? user.password_hash : await dummyPasswordHash
      );
      if (!user || !hasPassword || !isMatch)
        return res.status(400).json({ error: "Incorrect email or password." });

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
