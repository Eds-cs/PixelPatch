// server/server.js

import "./loadEnv.js"

import express from "express";
import cors from "cors";
import http from "http";
import path from "path";

import chatRoutes from "./routes/chat.js";
import businessRoutes from "./routes/businessRoutes.js";
import businessDashboardRoutes from "./routes/businessDashboardRoutes.js";
import userRoutes from "./routes/users.js";
import authRoutes from "./routes/auth.js";
import otpRoutes from "./routes/otp.js";
import uploadRoutes from "./routes/upload.js";
import aiRouter from "./routes/ai.js";
import aiHistoryRoutes from "./routes/aiHistoryRoutes.js";
import shopRoutes from "./routes/shops.js";
import servicesRoutes from "./routes/services.js";
import reviewsRoutes from "./routes/reviews.js";
import documentsRoutes from "./routes/documents.js";
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

// routes for Xendit Webhooks
import xenditWebhookRoutes from "./routes/webhooks/xenditWebhookRoutes.js";

// routes for client reviews
import clientReviewsRoutes from "./routes/clientReviewsRoutes.js";

// routes for disputes
import disputesRoutes from "./routes/disputes.routes.js";

// Initialize Express app
const app = express();

app.use((req, res, next) => {
  console.log("➡️ Incoming:", req.method, req.originalUrl);
  next();
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

/* AUTH / USER */
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/auth", otpRoutes);
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
app.use("/api/shops", documentsRoutes);
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
  cors: { origin: true, credentials: true },
});

import setupChatSockets from "./sockets/chatSocket.js";
setupChatSockets(io);

httpServer.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port " + (process.env.PORT || 5000));
});
