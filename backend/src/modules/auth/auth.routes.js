const express = require('express');
const AuthController = require('./auth.controller');
const { authenticateToken } = require('../rbac/auth.middleware');

const router = express.Router();
const authController = new AuthController();

// Public routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/mfa/setup', (req, res) => authController.setupMfa(req, res));
router.post('/mfa/verify', (req, res) => authController.verifyMfa(req, res));
router.post('/mfa/verify-login', (req, res) => authController.verifyMfaLogin(req, res));
router.post('/refresh', (req, res) => authController.refreshToken(req, res));

// Protected routes
router.post('/logout', authenticateToken, (req, res) => authController.logout(req, res));

module.exports = router;