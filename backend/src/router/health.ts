import express from "express";
import mongoose from "mongoose";
import { Request, Response } from "express";

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check - MongoDB and API status
 *     description: Returns the health status of the API and MongoDB connection
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     api:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: up
 *                         uptime:
 *                           type: number
 *                           description: Server uptime in seconds
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [connected, disconnected, connecting, disconnecting]
 *                         readyState:
 *                           type: number
 *                           description: Mongoose connection state (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     api:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         error:
 *                           type: string
 */
router.get("/health", (req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  
  const healthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      api: {
        status: "up",
        uptime: process.uptime(),
      },
      database: {
        status: dbStates[dbState],
        readyState: dbState,
      },
    },
  };

  // If database is not connected, mark as unhealthy
  if (dbState !== 1) {
    healthCheck.status = "unhealthy";
    return res.status(503).json(healthCheck);
  }

  res.status(200).json(healthCheck);
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe - Basic API check
 *     description: Simple endpoint to check if API is running (Kubernetes liveness probe)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: alive
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get("/health/live", (req: Request, res: Response) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe - Check if API is ready to serve requests
 *     description: Checks API and database readiness (Kubernetes readiness probe)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ready
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [connected, disconnected]
 *       503:
 *         description: API is not ready
 */
router.get("/health/ready", (req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const isReady = dbState === 1;

  const response = {
    status: isReady ? "ready" : "not ready",
    timestamp: new Date().toISOString(),
    database: {
      status: isReady ? "connected" : "disconnected",
    },
  };

  res.status(isReady ? 200 : 503).json(response);
});

export default router;
