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

// Import the Redis initialization function
import { initializeRedis } from "../databases/redis.databases.js";

// Instantiate server.
const server = express();

/** Configure middlewares... */

/**
 * Configure security headers using helmet
 * Settings are optimized for a backend service with unnecessary browser protections disabled
 */
server.use(
  helmet({
    contentSecurityPolicy: false, // Less relevant for pure backend
    crossOriginEmbedderPolicy: false, // Less relevant for APIs
    // ... we'll keep the rest of the defaults.
  })
);

/**
 * Parse JSON request bodies
 * Configures Express to handle application/json content type
 */
server.use(express.json());

/**
 * Parse JSON request bodies with body-parser
 * Note: This is redundant with express.json() in modern Express versions
 * @deprecated Consider removing as express.json() now uses body-parser internally
 */
server.use(bodyParser.json());

/**
 * Parse URL-encoded request bodies
 * Handles form submissions with application/x-www-form-urlencoded content type
 * extended: false restricts values to strings or arrays only
 */
server.use(express.urlencoded({ extended: false }));

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
    console.log("Connecting to MongoDB...");
    await connectToDatabase();

    // Connect to Redis
    console.log("Connecting to Redis...");
    const redisConnected = await initializeRedis();

    if (!redisConnected) {
      console.error(
        "WARNING: Redis connection failed. Email functionality will be limited."
      );
    }

    // Start the server only after connections are initialized
    server.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
      console.log(`API version: ${VERSION}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
