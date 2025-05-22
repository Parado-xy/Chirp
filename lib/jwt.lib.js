/**
 * @fileoverview JWT Utilities Library
 * 
 * This module provides utilities for creating and managing JSON Web Tokens (JWT)
 * used for authentication in the application. It encapsulates JWT operations
 * to provide a consistent interface for token generation.
 * 
 * @module jwtLib
 * @requires jsonwebtoken
 * @requires ../src/env
 */

import jwt from "jsonwebtoken"; 
import { JWT_EXPIRES_IN, JWT_SECRET } from "../src/env.js";

/**
 * JWT configuration options
 * 
 * @constant {Object} options
 * @property {string|number} expiresIn - Token expiration time, loaded from environment variables
 */
let options = {
    expiresIn: JWT_EXPIRES_IN
}

/**
 * Generates a signed JWT token
 * 
 * @function generateToken
 * @param {Object} payload - The data to be encoded in the token
 * @param {string} [payload.id] - User/Organization ID
 * @param {string} [payload.email] - User/Organization email
 * @param {string} [payload.name] - User/Organization name
 * @returns {string} The signed JWT token
 * 
 * @example
 * // Generate a token for organization authentication
 * const token = generateToken({ 
 *   id: organization._id,
 *   email: organization.email,
 *   name: organization.name
 * });
 */
function generateToken(payload){
    const token = jwt.sign(payload, JWT_SECRET, options);
    return token;
}

export { generateToken };