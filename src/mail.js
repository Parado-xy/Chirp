/**
 * @fileoverview Mail Service Entry Point
 *
 * This is the main entry point for the mail microservice application.
 * It initializes the Express server, configures middleware, connects routes,
 * initializes the database connection, and starts the HTTP server.
 *
 * @module mailService
 * @requires express
 * @requires cors
 * @requires body-parser
 * @requires helmet
 * @requires express-session
 * @requires ./env
 * @requires ../routes/dispatcher.routes
 * @requires ../middlewares/error.middlewares
 * @requires ../databases/mongodb.databases
 * @requires ../databases/redis.databases
 *
 * @author Omajuwa Jalla
 * @created 4/2/2025
 */

// Import dependencies.
import express from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import session from "express-session";
import expressEjsLayouts from "express-ejs-layouts";
import RedisStore from "connect-redis";
import redisClient from "../databases/redis.databases.js";

// Import ENV variables.
import { PORT, NODE_ENV, VERSION, JWT_SECRET } from "./env.js";

// Import logging configuration
import logger, { httpLogger } from "../lib/logger.lib.js";

// Import CORS middleware
import corsMiddleware from "../middlewares/cors.middlewares.js";

// Import rate limiting middleware
import { generalApiLimiter } from "../middlewares/rateLimiter.middlewares.js";

// Import the Redis initialization function
import { initializeRedis } from "../databases/redis.databases.js";

// Instantiate server.
const server = express();

/** Configure middlewares... */

/**
 * Configure security headers using helmet
 * Enhanced security configuration for production API service
 */
server.use(
  helmet({
    // Content Security Policy - restrictive for API
    contentSecurityPolicy:
      NODE_ENV === "production"
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"], // For EJS templates
              imgSrc: ["'self'", "data:", "https:"],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
            },
          }
        : false, // Disable in development for easier debugging

    // Cross Origin Embedder Policy - not needed for APIs
    crossOriginEmbedderPolicy: false,

    // Strict Transport Security - enforce HTTPS in production
    hsts:
      NODE_ENV === "production"
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          }
        : false,

    // Disable X-Powered-By header
    hidePoweredBy: true,

    // Prevent MIME type sniffing
    noSniff: true,

    // Prevent clickjacking
    frameguard: { action: "deny" },

    // XSS Protection
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: { policy: "same-origin" },
  })
);

/**
 * Configure CORS policy based on environment
 */
server.use(corsMiddleware());

/**
 * Apply general rate limiting to all requests
 */
server.use(generalApiLimiter);

/**
 * Parse JSON request bodies with size limits
 * Configures Express to handle application/json content type with security limits
 */
server.use(
  express.json({
    limit: "10mb", // Reasonable limit for email content with attachments
    type: "application/json",
    verify: (req, res, buf, encoding) => {
      // Store raw body for webhook signature verification if needed
      req.rawBody = buf;
    },
  })
);

/**
 * Parse JSON request bodies with body-parser (legacy support)
 * Note: This is redundant with express.json() in modern Express versions
 * @deprecated Consider removing as express.json() now uses body-parser internally
 */
server.use(
  bodyParser.json({
    limit: "10mb",
  })
);

/**
 * Parse URL-encoded request bodies with size limits
 * Handles form submissions with application/x-www-form-urlencoded content type
 * extended: false restricts values to strings or arrays only
 */
server.use(
  express.urlencoded({
    extended: false,
    limit: "10mb",
  })
);

/**
 * Add session middleware with Redis store
 * Configures session support with persistent Redis storage
 */
server.use(
  session({
    store: new RedisStore({
      client: redisClient,
      prefix: "chirp:sess:",
      ttl: 3600, // Session TTL in seconds (1 hour)
    }),
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: NODE_ENV === "production",
      maxAge: 3600000, // 1 hour in milliseconds
      httpOnly: true, // Security: prevent client-side access
    },
    name: "chirp.sid", // Custom session name
  })
);

/**
 * Add HTTP request logging middleware
 * Logs all incoming requests and responses
 */
server.use(httpLogger);

/**
 * Setup EJS view engine
 * Configures the application to use EJS for rendering views
 */
server.use(expressEjsLayouts);
server.set("view engine", "ejs");
server.set("views", "./views");
server.set("layout", "../views/layouts/main.ejs");

/**
 * Serve static files
 * Configures the application to serve static files from the 'public' directory
 */
server.use(express.static("public"));

/**
 * Connect API routes to the application
 * Routes are mounted under the versioned API path by the dispatcher
 */
import dispatcherRoutes from "../routes/dispatcher.routes.js";
dispatcherRoutes(server);

/**
 * Global error handling middleware
 * Catches and processes any errors that occur during request handling
 */
import errorMiddleware from "../middlewares/error.middlewares.js";
server.use(errorMiddleware);

/**
 * Database connection initialization
 * Establishes connection to MongoDB using mongoose
 *
 * @async
 * @function connectToDatabase
 * @returns {Promise<void>}
 */
import connectToDatabase from "../databases/mongodb.databases.js";

/**
 * Start the HTTP server and initialize the database and Redis connections
 * Listens on the port specified in environment variables
 */
async function startServer() {
  try {
    // Connect to MongoDB
    logger.info("Connecting to MongoDB...");
    await connectToDatabase();

    // Connect to Redis
    logger.info("Connecting to Redis...");
    const redisConnected = await initializeRedis();

    if (!redisConnected) {
      logger.warn(
        "WARNING: Redis connection failed. Email functionality will be limited."
      );
    }

    // Start the server only after connections are initialized
    server.listen(PORT, () => {
      logger.info(`Server listening on http://localhost:${PORT}`, {
        port: PORT,
        version: VERSION,
        environment: NODE_ENV,
      });
    });
  } catch (error) {
    logger.error("Failed to start server", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

startServer();
