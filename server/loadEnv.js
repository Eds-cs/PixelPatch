import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env, then let .env.local override it — mirroring how the Expo app
// resolves its own env files, so both halves of the project behave the same.
// Without the second call a server/.env.local would be silently ignored.
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, ".env.local"), override: true });
