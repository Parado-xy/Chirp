/**
 * @fileoverview Organization Schema Model
 * 
 * This module defines the MongoDB schema for organizations that will join
 * the mail service. It includes fields for organization information, API keys,
 * service configuration, and usage statistics.
 * 
 * @module organizationModel
 * @requires mongoose
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * Schema for organization entities using the mail service
 * 
 * @typedef {Object} Organization
 * @property {string} name - The organization's name
 * @property {string} email - The organization's contact email (unique)
 * @property {string} apiKey - The unique API key for authentication
 * @property {string} status - Current status of the organization's account
 * @property {Object} usage - Email usage statistics
 * @property {number} usage.totalEmailsSent - Count of emails sent
 * @property {Date} usage.lastEmailSentAt - Timestamp of last sent email
 * @property {Date} createdAt - Timestamp when the organization was created
 * @property {Date} updatedAt - Timestamp when the organization was last updated
 */
const organizationSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  apiKey: {
    type: String,
    required: true,
    unique: true,
    index: true, // Indexed for faster queries on API key lookups
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended'],
    default: 'active'
  },
  usage: {
    totalEmailsSent: {
      type: Number,
      default: 0
    },
    lastEmailSentAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automatically update createdAt and updatedAt fields
});

/**
 * Model for Organizations
 * 
 * @type {mongoose.Model<Organization>}
 */
const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;