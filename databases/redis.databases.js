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

// Global connection state tracker
let isConnected = false;

console.log(`Attempting Redis Cloud connection to ${REDIS_HOST}:${REDIS_PORT}`);

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
  console.log(`Redis connection established to ${REDIS_HOST}:${REDIS_PORT}`);
  isConnected = true;
});

redisClient.on("ready", () => {
  console.log("Redis client is ready to send commands");
  isConnected = true;
});

redisClient.on("error", (error) => {
  console.error("Redis connection error:", error);
  isConnected = false;
});

redisClient.on("close", () => {
  console.log("Redis connection closed");
  isConnected = false;
});

redisClient.on("reconnecting", () => {
  console.log("Redis client reconnecting...");
});

// Export a function to initialize the connection
export async function initializeRedis() {
  try {
    // Test the connection with a PING (ioredis connects automatically)
    const pingResult = await redisClient.ping();
    console.log("Redis PING result:", pingResult);
    return true;
  } catch (error) {
    console.error("Redis initialization failed:", error.message);
    return false;
  }
}

// Helper to check connection status
export function isRedisConnected() {
  return redisClient.status === "ready" && isConnected;
}

export default redisClient;
