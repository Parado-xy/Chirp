/**
 * @fileoverview Health Check Routes
 *
 * This module provides health check endpoints for load balancer and monitoring systems.
 * Includes basic health check and detailed readiness check with dependency status.
 *
 * @module healthRoutes
 * @requires express
 */

import express from "express";
import mongoose from "mongoose";
import { isRedisConnected } from "../databases/redis.databases.js";
import logger from "../lib/logger.lib.js";
import { VERSION, NODE_ENV } from "../src/env.js";

const router = express.Router();

/**
 * Basic health check endpoint
 * Returns simple status for load balancer health checks
 *
 * GET /health
 *
 * @returns {Object} Basic health status
 */
router.get("/health", (req, res) => {
  const healthCheck = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: VERSION,
    environment: NODE_ENV,
  };

  logger.debug("Health check requested", healthCheck);

  res.status(200).json(healthCheck);
});

/**
 * Detailed readiness check endpoint
 * Returns comprehensive status including all dependencies
 *
 * GET /ready
 *
 * @returns {Object} Detailed readiness status with dependency checks
 */
router.get("/ready", async (req, res) => {
  const checks = {
    mongodb: false,
    redis: false,
    memory: false,
    disk: false,
  };

  let overallStatus = "ok";
  let statusCode = 200;

  try {
    // Check MongoDB connection
    checks.mongodb = mongoose.connection.readyState === 1;
    if (!checks.mongodb) {
      overallStatus = "error";
      statusCode = 503;
    }

    // Check Redis connection
    checks.redis = isRedisConnected();
    if (!checks.redis) {
      // Redis failure is not critical, just log warning
      logger.warn("Redis connection unavailable during readiness check");
    }

    // Check memory usage (alert if > 85%)
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    checks.memory = memUsagePercent < 85;
    if (!checks.memory) {
      logger.warn("High memory usage detected", { memUsagePercent });
    }

    // Basic disk check (ensure we can write to temp)
    checks.disk = true; // Simplified for now
  } catch (error) {
    logger.error("Readiness check failed", { error: error.message });
    overallStatus = "error";
    statusCode = 503;
  }

  const readinessCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: VERSION,
    environment: NODE_ENV,
    uptime: process.uptime(),
    checks,
    details: {
      mongodb: {
        status: checks.mongodb ? "connected" : "disconnected",
        readyState: mongoose.connection.readyState,
      },
      redis: {
        status: checks.redis ? "connected" : "disconnected",
      },
      memory: {
        status: checks.memory ? "ok" : "high",
        usage: process.memoryUsage(),
      },
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
  };

  logger.debug("Readiness check completed", {
    status: overallStatus,
    checks,
  });

  res.status(statusCode).json(readinessCheck);
});

/**
 * Metrics endpoint (basic)
 * Returns basic application metrics
 *
 * GET /metrics
 *
 * @returns {Object} Basic application metrics
 */
router.get("/metrics", (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    version: VERSION,
    environment: NODE_ENV,
    mongodb: {
      readyState: mongoose.connection.readyState,
      readyStateString: getMongoReadyState(mongoose.connection.readyState),
    },
    redis: {
      connected: isRedisConnected(),
    },
  };

  res.status(200).json(metrics);
});

/**
 * Helper function to convert MongoDB ready state to string
 * @param {number} state - MongoDB connection ready state
 * @returns {string} Human readable state
 */
function getMongoReadyState(state) {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[state] || "unknown";
}

export default router;
