/**
 * @fileoverview Redis Database Connection Module using ioredis
 */

import IORedis from "ioredis";
import {
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  REDIS_USERNAME,
} from "../src/env.js";
import logger from "../lib/logger.lib.js";

// Global connection state tracker
let isConnected = false;

logger.info(`Attempting Redis Cloud connection`, {
  host: REDIS_HOST,
  port: REDIS_PORT,
  hasTLS: REDIS_HOST.includes("redis.cloud"),
});

/**
 * Configured Redis client instance using ioredis for Redis Cloud
 */
const redisClient = new IORedis({
  host: REDIS_HOST,
  port: parseInt(REDIS_PORT),
  username: REDIS_USERNAME,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  connectTimeout: 30000, // Longer timeout for initial connection
  // TLS options for secure Redis Cloud connections
  tls: REDIS_HOST.includes("redis.cloud") ? {} : undefined,
  // Retry strategy for cloud connections
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Detailed connection events
redisClient.on("connect", () => {
  logger.info(`Redis connection established`, {
    host: REDIS_HOST,
    port: REDIS_PORT,
  });
  isConnected = true;
});

redisClient.on("ready", () => {
  logger.info("Redis client is ready to send commands");
  isConnected = true;
});

redisClient.on("error", (error) => {
  logger.error("Redis connection error", { error: error.message });
  isConnected = false;
});

redisClient.on("close", () => {
  logger.warn("Redis connection closed");
  isConnected = false;
});

redisClient.on("reconnecting", () => {
  logger.info("Redis client reconnecting...");
});

// Export a function to initialize the connection
export async function initializeRedis() {
  try {
    // Test the connection with a PING (ioredis connects automatically)
    const pingResult = await redisClient.ping();
    logger.info("Redis PING successful", { result: pingResult });
    return true;
  } catch (error) {
    logger.error("Redis initialization failed", { error: error.message });
    return false;
  }
}

// Helper to check connection status
export function isRedisConnected() {
  return redisClient.status === "ready" && isConnected;
}

export default redisClient;
