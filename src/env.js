/**
 * @fileoverview Environment Configuration Module
 *
 * This module handles loading and exporting environment variables for theHub application.
 * It uses dotenv to load environment-specific configuration from local environment files
 * based on the current NODE_ENV setting.
 *
 * @module env
 * @requires dotenv
 */

import { config } from "dotenv";

/**
 * Configure dotenv to read the environment-specific .env file
 * The path is determined dynamically based on the current NODE_ENV value
 * Falls back to "development" if NODE_ENV is not specified
 */
config({
  // eslint-disable-next-line no-undef
  path: `.env`,
});

export const {
  PORT,
  NODE_ENV,
  ARCJET_KEY, 
  ARCJET_ENV,
  SMTP_USER,
  SMTP_PASS,
  MAIL_SERVICE_PROVIDER,
  VERSION,
  DB_URI,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  REDIS_USERNAME,
  JWT_EXPIRES_IN,
  JWT_SECRET,
  ACCOUNT_SID,
  AUTH_TOKEN
  // eslint-disable-next-line no-undef
} = process.env;
