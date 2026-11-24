// server/server.js

import "./loadEnv.js"

import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import fs from "fs";

import chatRoutes from "./routes/chat.js";
import businessRoutes from "./routes/businessRoutes.js";
import businessDashboardRoutes from "./routes/businessDashboardRoutes.js";
import userRoutes from "./routes/users.js";
import authRoutes from "./routes/auth.js";
import uploadRoutes from "./routes/upload.js";
import aiRouter from "./routes/ai.js";
import aiHistoryRoutes from "./routes/aiHistoryRoutes.js";
import shopRoutes from "./routes/shops.js";
import servicesRoutes from "./routes/services.js";
import reviewsRoutes from "./routes/reviews.js";
import { serveShopDocument } from "./controllers/admin/shopReviewController.js";
import shopServiceRoutes from "./routes/shopServiceRoutes.js";
import repairRoutes from "./routes/repairRoutes.js";

// ROUTES FOR USER PROFILE AND DEVICES
import userDevicesRoutes from "./routes/userDevices.routes.js";
import userProfileRoutes from "./routes/userProfile.routes.js";

// ROUTES FOR REPAIR REQUESTS CLIENT SIDE
import clientRepairsRoutes from "./routes/clientRepairsRoutes.js";

// ROUTES FOR SHOP'S PUBLIC SERVICES AND SHOPS
import publicServicesRoutes from "./routes/publicServices.routes.js";

// Routes for Repair Requests
import devices from "./routes/devices.js";
import addresses from "./routes/addresses.js";
import serviceRequests from "./routes/serviceRequests.js";

// Routes for Business Employees
import employeeRoutes from "./routes/business/employeeRoutes.js";

// BUSINESS PAYMENT ROUTES
import paymentRoutes from "./routes/business/paymentRoutes.js";

// BUSINESS SERVICE CATALOG ROUTES
import businessServiceRoutes from "./routes/business/serviceRoutes.js";

// BUSINESS SHOP SETTINGS (payment terms)
import shopSettingsRoutes from "./routes/business/shopSettingsRoutes.js";

// ADMIN ROUTES (admin role only)
import adminRoutes from "./routes/admin.js";

// routes for Xendit Webhooks
import xenditWebhookRoutes from "./routes/webhooks/xenditWebhookRoutes.js";

// routes for client reviews
import clientReviewsRoutes from "./routes/clientReviewsRoutes.js";

// routes for disputes
import disputesRoutes from "./routes/disputes.routes.js";

// Initialize Express app
const app = express();

// Hosting settings (all optional; local development needs none of them).
// TRUST_PROXY: set to 1 behind a reverse proxy (Caddy/nginx) so req.ip is the
// visitor's address and the login/signup rate limits are per visitor.
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
// CORS_ORIGINS: comma-separated websites allowed to call the API from a
// browser, e.g. "https://pixelpatch.example.com". Unset = allow any (dev).
const corsOrigins = (process.env.CORS_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
const corsOrigin = corsOrigins.length ? corsOrigins : true;

// Upload folders must exist before multer writes to them.
fs.mkdirSync("uploads/requests", { recursive: true });

app.use((req, res, next) => {
  console.log("➡️ Incoming:", req.method, req.originalUrl);
  next();
});

app.use(cors({ origin: corsOrigin }));
app.use(express.json());
// uploads/private/ holds shop permits and other documents: never served as
// static files. Admins open them through a signed link (below).
app.use("/uploads/private", (req, res) => res.sendStatus(404));
app.use("/uploads", express.static("uploads"));
app.get("/api/shop-documents/:token", serveShopDocument);

/* AUTH / USER */
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRouter);
app.use("/api/ai", aiHistoryRoutes);

// ROUTE for PROFILES
app.use("/api/user/devices", userDevicesRoutes);
app.use("/api/user/profile", userProfileRoutes);

// SHOP APIs
app.use("/api/shops", shopRoutes);
app.use("/api/shops", servicesRoutes);
app.use("/api/shops", reviewsRoutes);
app.use("/api/shop-services", shopServiceRoutes);

/* REPAIR REQUEST ROUTES */
app.use("/api/devices", devices);
app.use("/api/addresses", addresses);
app.use("/api/service-requests", serviceRequests);

/* BUSINESS */
app.use("/api", businessRoutes);
app.use("/api/business/repairs", repairRoutes);

// BUSINESS EMPLOYEE ROUTES
app.use("/api/business", employeeRoutes);

// BUSINESS DASHBOARD ROUTES
app.use("/api/business", businessDashboardRoutes);

// BUSINESS PAYMENT ROUTES
app.use("/api/business", paymentRoutes);

// BUSINESS SERVICE CATALOG ROUTES
app.use("/api/business", businessServiceRoutes);
app.use("/api/business", shopSettingsRoutes);

// ADMIN ROUTES
app.use("/api/admin", adminRoutes);

/* CHAT */
app.use("/api", chatRoutes);

/* XENDIT WEBHOOKS */
app.use("/api/webhooks", xenditWebhookRoutes);

// client repair routes
app.use("/api/client", clientRepairsRoutes);

// client reviews routes
app.use("/api/client", clientReviewsRoutes);

// disputes routes
app.use("/api/disputes", disputesRoutes);

// PUBLIC SERVICES AND SHOPS
app.use("/api/public", publicServicesRoutes);

// SOCKET.IO SERVER
const httpServer = http.createServer(app);

import { Server as IOServer } from "socket.io";
const io = new IOServer(httpServer, {
  cors: { origin: corsOrigin, credentials: true },
});

import setupChatSockets from "./sockets/chatSocket.js";
setupChatSockets(io);

httpServer.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port " + (process.env.PORT || 5000));
});
