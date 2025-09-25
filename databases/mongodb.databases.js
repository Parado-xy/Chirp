/**
 * @fileoverview MongoDB Database Connection Module
 *
 * This module provides functionality to connect to the MongoDB database for theHub application.
 * It establishes and manages the connection to MongoDB using Mongoose ORM with optimized
 * connection pool settings for performance and reliability.
 *
 * The module verifies that required environment variables are present, handles connection
 * errors gracefully, and provides appropriate logging for the connection status.
 *
 * @module mongodbDatabase
 * @requires mongoose
 * @requires ../src/env.js
 */

import mongoose from "mongoose";

import { DB_URI, NODE_ENV } from "../src/env.js";
import logger, { logDatabaseOperation } from "../lib/logger.lib.js";

// Verify that the database URI environment variable is defined
if (!DB_URI) {
  throw new Error(`
        Please define the MONGODB__URI environment vatiable inside .env.<development/production>.local
        `);
}

/**
 * Connects to MongoDB database with optimized connection pool settings.
 * Establishes a connection to the database specified in environment variables
 * with parameters tuned for performance and reliability.
 *
 * @async
 * @function connectToDatabase
 * @returns {Promise<void>} A promise that resolves when connection is established
 * @throws {Error} If connection fails, logs the error and exits the process
 *
 * @example
 * // Import and use in server initialization
 * import connectToDatabase from './databases/mongodb.databases.js';
 *
 * async function startServer() {
 *   await connectToDatabase();
 *   console.log('Database connected, starting server...');
 * }
 */
const connectToDatabase = async () => {
  try {
    await mongoose.connect(DB_URI, {
      // connection pool settings.
      maxPoolSize: 25, // Set a max pool-size of 25;
      minPoolSize: 10, // Keep a minimum of 10 connections ready.
      socketTimeoutMS: 45000, // Wait for 45000 ms before timing out a socket.
      serverSelectionTimeoutMS: 5000, // Connection attempt timeout.
      family: 4, // Use IPv4
    });

    // Log successful connection
    logger.info(`Database connection successful`, {
      environment: NODE_ENV,
      poolSize: { max: 25, min: 10 },
      timeouts: { socket: 45000, serverSelection: 5000 },
    });

    logDatabaseOperation("connect", "mongodb", { environment: NODE_ENV });
  } catch (err) {
    logger.error("Database connection failed", {
      error: err.message,
      stack: err.stack,
      environment: NODE_ENV,
    });
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
};

export default connectToDatabase;
