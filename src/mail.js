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
 * @requires ./env
 * @requires ../routes/dispatcher.routes
 * @requires ../middlewares/error.middlewares
 * @requires ../databases/mongodb.databases
 * 
 * @author Omajuwa Jalla
 * @created 4/2/2025
 */

// Import dependencies. 
import express from "express"; 
import cors from "cors"; 
import bodyParser from "body-parser";
import helmet from "helmet";

// Import ENV variables.
import { PORT, NODE_ENV, VERSION } from "./env.js";

// Instantiate server. 
const server = express(); 

/** Configure middlewares... */

/**
 * Configure security headers using helmet
 * Settings are optimized for a backend service with unnecessary browser protections disabled
 */
server.use(helmet({
  contentSecurityPolicy: false, // Less relevant for pure backend
  crossOriginEmbedderPolicy: false, // Less relevant for APIs
  // ... we'll keep the rest of the defaults. 
}));

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
 * @function startDB
 * @returns {Promise<void>}
 */
import connectToDatabase from "../databases/mongodb.databases.js";
async function startDB(){
    console.log(`Connecting to Database...`)
   await connectToDatabase()
}

/**
 * Start the HTTP server and initialize the database connection
 * Listens on the port specified in environment variables
 */
server.listen(PORT, async ()=> {
    console.log(`Port listening on: http://localhost:${PORT}
        This is application version ${VERSION}`); 
    await startDB(); 
});

/**
 * No explicit export as this is the application entry point
 */


