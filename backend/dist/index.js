import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { connectDB, prisma } from "./lib/prisma.js";
import { getEnv } from "./lib/env.js";
// routes
import authRouter from "./modules/auth/auth.routes.js";
import userRouter from "./modules/users/user.routes.js";
import projectRouter from "./modules/projects/projects.routes.js";
import taskRouter from "./modules/tasks/task.routes.js";
import streamRouter from "./modules/stream/stream.routes.js";
import imagekitRouter from "./modules/imagekit/imagekit.routes.js";
// middlewares
import { errorHandlerMiddleware } from "./middlewares/errorHandler.js";
import { authenticatedUser } from "./middlewares/auth.js";
import { redisClient } from "./lib/redis.js";
import { globalLimiter } from "./middlewares/rateLimiters.js";
import { healthCheck } from "./modules/health/health.controller.js";
import { syncWorker } from "./workers/sync.worker.js";
import { syncQueue } from "./lib/queues.js";
import { queueConnection } from "./lib/queueConnection.js";
const env = getEnv();
connectDB();
const app = express();
// Middleware to parse JSON bodies and cookies
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(helmet());
// Health check - register BEFORE the limiter so monitors never get 429s
// Excluding this route prevents the blocking of health check tools
app.get("/api/v1/health", healthCheck);
// Global API safety net (shared across instances/restarts via Redis)
app.use("/api/v1", globalLimiter);
// API Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", authenticatedUser, userRouter);
app.use("/api/v1/projects", authenticatedUser, projectRouter);
app.use("/api/v1/tasks", authenticatedUser, taskRouter);
app.use("/api/v1/stream", authenticatedUser, streamRouter);
app.use("/api/v1/imagekit", authenticatedUser, imagekitRouter);
// Global Error Handler
// TRIGGERED BY OUR EXISTING ROUTES IF THERE IS A VALID REQUEST AND HAS AN ERROR
app.use(errorHandlerMiddleware);
const publicDir = path.join(process.cwd(), "public");
if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get("/{*any}", (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
            next();
            return;
        }
        if (req.path.startsWith("/api") || req.path.startsWith("/webhooks")) {
            next();
            return;
        }
        res.sendFile(path.join(publicDir, "index.html"), (err) => next(err));
    });
}
const server = app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}...`);
});
/* ============ GRACEFUL SHUTDOWN ============
   1. Stop accepting new connections
   2. Let in-flight requests drain
   3. Close Redis + Prisma cleanly
   4. Force-exit if draining takes too long */
const SHUTDOWN_TIMEOUT_MS = 10_000;
const gracefulShutdown = (signal) => {
    console.log(`${signal} received - shutting down gracefully...`);
    server.close(async () => {
        try {
            // 1. Stop accepting new jobs and wait for active jobs to finish
            await syncWorker.close();
            await syncQueue.close();
            // 2. Close all connections
            await queueConnection.quit();
            await redisClient.quit();
            await prisma.$disconnect();
            console.log("All connections closed. Bye 👋");
            process.exit(0);
        }
        catch (error) {
            console.error("Error during shutdown:", error);
            process.exit(1);
        }
    });
    setTimeout(() => {
        console.error("Forced shutdown: connections did not drain in time");
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
};
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
