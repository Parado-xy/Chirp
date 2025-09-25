/**
 * @fileoverview Rate Limiting Middleware
 *
 * This module provides rate limiting functionality to prevent abuse
 * and protect the API from DoS attacks. Different limits are applied
 * based on the endpoint and environment.
 *
 * @module rateLimitMiddleware
 * @requires express-rate-limit
 */

import rateLimit from "express-rate-limit";
import { NODE_ENV } from "../src/env.js";
import logger from "../lib/logger.lib.js";

/**
 * IPv6-compatible key generator helper
 * Properly handles both IPv4 and IPv6 addresses
 */
const getClientKey = (req, prefix = "") => {
  // For IPv6 compatibility, we need to normalize the IP address
  const ip =
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown";

  // Normalize IPv6 addresses
  const normalizedIp = ip.replace(/^::ffff:/, ""); // Remove IPv4-mapped IPv6 prefix

  return `${prefix}${normalizedIp}`;
};

/**
 * Rate limit message for API endpoints
 */
const API_RATE_LIMIT_MESSAGE = {
  success: false,
  error: {
    message: "Too many requests. Please try again later.",
    type: "RateLimitError",
    status: 429,
    retryAfter: "Check the Retry-After header for when to retry",
    timestamp: new Date().toISOString(),
  },
};

/**
 * General API rate limiter
 * Applies to all API endpoints for basic protection
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === "production" ? 100 : 1000, // More restrictive in production
  message: API_RATE_LIMIT_MESSAGE,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use API key if available, otherwise use IPv6-compatible IP
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return `api_key:${authHeader.split(" ")[1]}`;
    }
    return getClientKey(req, "ip:");
  },
  handler: (req, res) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      path: req.path,
      method: req.method,
      apiKey: req.headers.authorization ? "present" : "missing",
    });

    res.status(429).json(API_RATE_LIMIT_MESSAGE);
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return (
      req.path.startsWith("/health") ||
      req.path.startsWith("/ready") ||
      req.path.startsWith("/metrics")
    );
  },
});

/**
 * Authentication endpoint rate limiter
 * More restrictive for login/register endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === "production" ? 10 : 50, // Very restrictive for auth endpoints
  message: {
    success: false,
    error: {
      message:
        "Too many authentication attempts. Please try again in 15 minutes.",
      type: "AuthRateLimitError",
      status: 429,
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientKey(req, "auth:"),
  handler: (req, res) => {
    logger.warn("Auth rate limit exceeded", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      success: false,
      error: {
        message:
          "Too many authentication attempts. Please try again in 15 minutes.",
        type: "AuthRateLimitError",
        status: 429,
        timestamp: new Date().toISOString(),
      },
    });
  },
});

/**
 * Email sending rate limiter
 * Controls email sending frequency per organization
 */
export const emailLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: NODE_ENV === "production" ? 10 : 100, // 10 emails per minute in production
  message: {
    success: false,
    error: {
      message:
        "Email sending rate limit exceeded. Please wait before sending more emails.",
      type: "EmailRateLimitError",
      status: 429,
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per organization
    if (req.organization) {
      return `email:org:${req.organization._id}`;
    }
    return getClientKey(req, "email:ip:");
  },
  handler: (req, res) => {
    logger.warn("Email rate limit exceeded", {
      organizationId: req.organization?._id,
      organizationName: req.organization?.name,
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: {
        message:
          "Email sending rate limit exceeded. Please wait before sending more emails.",
        type: "EmailRateLimitError",
        status: 429,
        timestamp: new Date().toISOString(),
      },
    });
  },
});

/**
 * SMS sending rate limiter
 * Controls SMS sending frequency per organization
 */
export const smsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: NODE_ENV === "production" ? 5 : 50, // 5 SMS per minute in production
  message: {
    success: false,
    error: {
      message:
        "SMS sending rate limit exceeded. Please wait before sending more messages.",
      type: "SMSRateLimitError",
      status: 429,
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per organization
    if (req.organization) {
      return `sms:org:${req.organization._id}`;
    }
    return getClientKey(req, "sms:ip:");
  },
  handler: (req, res) => {
    logger.warn("SMS rate limit exceeded", {
      organizationId: req.organization?._id,
      organizationName: req.organization?.name,
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: {
        message:
          "SMS sending rate limit exceeded. Please wait before sending more messages.",
        type: "SMSRateLimitError",
        status: 429,
        timestamp: new Date().toISOString(),
      },
    });
  },
});

export default {
  generalApiLimiter,
  authLimiter,
  emailLimiter,
  smsLimiter,
};
