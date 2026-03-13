const express = require('express');
const AdminController = require('./admin.controller');
const { authenticateToken, requireRole } = require('../rbac/auth.middleware');

const router = express.Router();
const adminController = new AdminController();

// All admin routes require authentication and ADMIN role
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

router.post('/customers/:customerId/approve', (req, res) => 
  adminController.approveCustomer(req, res)
);

router.get('/customers/pending', (req, res) => 
  adminController.getPendingCustomers(req, res)
);

module.exports = router;