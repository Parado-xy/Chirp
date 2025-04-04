/**
 * @fileoverview Redis Database Connection Module using IORedis
 */

import IORedis from "ioredis";
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from "../src/env.js";

// Global connection state tracker
let isConnected = false;

// Detailed logging for troubleshooting
console.log(`Attempting Redis connection to ${REDIS_HOST}:${REDIS_PORT}`);

/**
 * Configured Redis client instance
 */
const redisClient = new IORedis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  connectTimeout: 30000, // Longer timeout for initial connection
  retryStrategy(times) {
    console.log(`Redis connection attempt ${times}`);
    return Math.min(times * 500, 5000); // Exponential backoff
  }
});

// Detailed connection events
redisClient.on('connect', () => {
  console.log(`Redis connection established to ${REDIS_HOST}:${REDIS_PORT}`);
  isConnected = true;
});

redisClient.on('ready', () => {
  console.log('Redis client is ready to send commands');
});

redisClient.on('error', (error) => {
  console.error('Redis connection error:', error);
  isConnected = false;
});

redisClient.on('close', () => {
  console.log('Redis connection closed');
  isConnected = false;
});

redisClient.on('reconnecting', () => {
  console.log('Redis client reconnecting...');
});

// Export a function to initialize the connection
export async function initializeRedis() {
  try {
    // Test the connection with a PING
    const pingResult = await redisClient.ping();
    console.log('Redis PING result:', pingResult);
    return true;
  } catch (error) {
    console.error('Redis initialization failed:', error.message);
    return false;
  }
}

// Helper to check connection status
export function isRedisConnected() {
  return isConnected && redisClient.status === 'ready';
}

export default redisClient;