/**
 * @fileoverview Web Interface Handler Functions
 * 
 * This module provides handlers for web interface routes, including
 * rendering pages, processing form submissions, and managing authentication
 * for the organization dashboard.
 * 
 * @module webHandlers
 * @requires crypto
 * @requires ../../models/organization.model
 * @requires ../../models/email.model
 * @requires ../../lib/jwt.lib
 */

import { randomBytes } from 'crypto'; 
import Organization from '../../models/organization.model.js';
import Email from '../../models/email.model.js';
import { generateToken } from '../../lib/jwt.lib.js';
import emailQueue from '../../queues/email.queue.js';

/**
 * Web route handler functions
 * 
 * @namespace
 */
const webHandler = {
  /**
   * Renders the home page
   * 
   * @function renderHome
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  'render-home': (req, res) => {
    res.render('home', { 
      title: 'Email Service API',
      isAuthenticated: req.session?.isAuthenticated || false,
      showNavbar: true,
      messages: req.query.message,
      messageType: req.query.type || 'info'
    });
  },

  /**
   * Renders the signup page
   * 
   * @function renderSignup
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  'render-signup': (req, res) => {
    res.render('auth/signup', { 
      title: 'Register',
      isAuthenticated: false,
      showNavbar: true
    });
  },

  /**
   * Processes organization registration
   * 
   * @async
   * @function register
   * @param {Object} req - Express request object
   * @param {Object} req.body - Registration form data
   * @param {string} req.body.name - Organization name
   * @param {string} req.body.email - Organization email
   * @param {string} req.body.password - Organization password
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  'register': async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      
      // Generate API key
      const apiKey = randomBytes(32).toString('hex');
      
      // Create organization
      const org = await Organization.create({
        name,
        email,
        password,
        apiKey,
        status: 'active'
      });
      
      // Generate JWT token
      const token = generateToken({ id: org._id, name, email });
      
      // Set session
      req.session.isAuthenticated = true;
      req.session.token = token;
      req.session.user = {
        id: org._id,
        name,
        email
      };
      
      // Redirect to show API key
      res.redirect('/auth/registered?apiKey=' + apiKey);
    } catch (error) {
      res.render('auth/signup', {
        title: 'Register',
        isAuthenticated: false,
        showNavbar: true,
        messages: error.code === 11000 ? 'An organization with this email already exists' : 'Registration failed',
        messageType: 'danger'
      });
    }
  },

  /**
   * Renders the registration success page with API key
   * 
   * @function renderRegistrationSuccess
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  'render-registration-success': (req, res) => {
    const apiKey = req.query.apiKey;
    
    if (!apiKey || !req.session.isAuthenticated) {
      return res.redirect('/auth/signup');
    }
    
    res.render('auth/success', {
      title: 'Registration Successful',
      apiKey,
      isAuthenticated: true,
      showNavbar: true
    });
  },

  /**
   * Renders the signin page
   * 
   * @function renderSignin
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  'render-signin': (req, res) => {
    res.render('auth/signin', { 
      title: 'Sign In',
      isAuthenticated: false,
      showNavbar: true
    });
  },

  /**
   * Processes user authentication
   * 
   * @async
   * @function signin
   * @param {Object} req - Express request object 
   * @param {Object} req.body - Login form data
   * @param {string} req.body.email - Organization email
   * @param {string} req.body.password - Organization password
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  'signin': async (req, res, next) => {
    try {
      const { email, password } = req.body;
      
      // Find organization
      const organization = await Organization.findOne({ email });
      
      if (!organization || !(await organization.comparePassword(password))) {
        return res.render('auth/signin', {
          title: 'Sign In',
          isAuthenticated: false,
          showNavbar: true,
          messages: 'Invalid email or password',
          messageType: 'danger'
        });
      }
      
      // Generate token
      const token = generateToken({
        id: organization._id,
        name: organization.name,
        email: organization.email
      });
      
      // Set session
      req.session.isAuthenticated = true;
      req.session.token = token;
      req.session.user = {
        id: organization._id,
        name: organization.name,
        email: organization.email
      };
      
      // Redirect to dashboard
      res.redirect('/dashboard');
    } catch (error) {
      res.render('auth/signin', {
        title: 'Sign In',
        isAuthenticated: false,
        showNavbar: true,
        messages: 'An error occurred during sign in',
        messageType: 'danger'
      });
    }
  },

  /**
   * Processes user signout
   * 
   * @function signout
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  'signout': (req, res) => {
    req.session.destroy();
    res.redirect('/');
  },

  /**
   * Renders the organization dashboard
   * 
   * @async
   * @function renderDashboard
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  'render-dashboard': async (req, res, next) => {
    try {
      const organization = await Organization.findById(req.organization.id);
      
      if (!organization) {
        req.session.destroy();
        return res.redirect('/auth/signin?message=Account not found&type=danger');
      }
      
      const recentEmails = await Email.find({ organization: req.organization.id })
        .sort({ createdAt: -1 })
        .limit(5);
      
      res.render('dashboard/index', {
        title: 'Dashboard',
        isAuthenticated: true,
        showNavbar: true,
        organization,
        recentEmails,
        messages: req.query.message,
        messageType: req.query.type || 'info'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Processes a test email send request
   * 
   * @async
   * @function sendTestEmail
   * @param {Object} req - Express request object
   * @param {Object} req.body - Test email data
   * @param {string} req.body.to - Recipient email
   * @param {string} req.body.subject - Email subject
   * @param {string} req.body.content - Email content
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  'send-test-email': async (req, res, next) => {
    try {
      const { to, subject, content } = req.body;
      const organization = await Organization.findById(req.organization.id);
      
      // Create email in database
      const email = await Email.create({
        to,
        subject,
        content,
        organization: organization._id,
        status: 'queued'
      });
      
      // Add to queue
      await emailQueue.add("sendEmail", {emailId: email._id.toString()}, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        timeout: 5000 
      });
      
      // Update organization usage statistics
      await Organization.findByIdAndUpdate(organization._id, {
        $inc: { 'usage.totalEmailsSent': 1 },
        $set: { 'usage.lastEmailSentAt': new Date() },
        $addToSet: {'emailList': to}
      });
      
      res.redirect('/dashboard?message=Test email queued successfully&type=success');
    } catch (error) {
      res.redirect('/dashboard?message=Failed to send test email&type=danger');
    }
  }
};

export default webHandler;