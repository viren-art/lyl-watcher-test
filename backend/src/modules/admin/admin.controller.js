const UserRepository = require('../../database/users/user.repository');
const EmailService = require('../../services/email/email.service');
const SecurityAuditRepository = require('../../database/users/security-audit.repository');

class AdminController {
  constructor() {
    this.userRepository = new UserRepository();
    this.emailService = new EmailService();
    this.securityAuditRepository = new SecurityAuditRepository();
  }

  /**
   * POST /api/v1/admin/customers/:customerId/approve
   * Approve pending customer registration
   */
  async approveCustomer(req, res) {
    try {
      const customerId = parseInt(req.params.customerId);
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      // Verify admin role
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin role required',
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      // Get customer details
      const customer = await this.userRepository.findCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Customer not found',
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      if (customer.active) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_APPROVED',
            message: 'Customer already approved',
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      // CRITICAL FIX: Validate admin user exists before approval
      const adminUser = await this.userRepository.getCustomerAdminUser(customerId);
      if (!adminUser) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_ADMIN_USER',
            message: 'Customer has no admin user configured',
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      // Approve customer
      const approvedCustomer = await this.userRepository.approveCustomer(customerId);

      // CRITICAL FIX: Assign default regions during approval (all 5 Phase 1 regions)
      const defaultRegionIds = [1, 2, 3, 4, 5]; // Northeast, Midwest, Western, Southern, Pacific
      for (const regionId of defaultRegionIds) {
        await this.userRepository.addCustomerRegion(customerId, regionId);
      }

      // Send approval email
      await this.emailService.sendAccountApproved({
        to: adminUser.email,
        companyName: customer.company_name,
        adminName: adminUser.full_name,
        loginUrl: process.env.APP_URL || 'https://platform.gridai.com/login'
      });

      // Log approval event
      await this.securityAuditRepository.logEvent({
        userId: req.user.userId,
        eventType: 'customer_approved',
        resourceAccessed: `customer:${customerId}`,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          approvedBy: req.user.email,
          companyName: customer.company_name,
          regionsAssigned: defaultRegionIds
        }
      });

      res.status(200).json({
        success: true,
        data: {
          customerId: approvedCustomer.customer_id,
          companyName: approvedCustomer.company_name,
          active: approvedCustomer.active,
          approvedAt: approvedCustomer.updated_at,
          regionsAssigned: defaultRegionIds,
          message: 'Customer approved successfully with default regional access'
        }
      });
    } catch (error) {
      console.error('Customer approval failed:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'APPROVAL_FAILED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  }

  /**
   * GET /api/v1/admin/customers/pending
   * Get list of pending customer approvals
   */
  async getPendingCustomers(req, res) {
    try {
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin role required',
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      const pendingCustomers = await this.userRepository.getPendingCustomers();

      res.status(200).json({
        success: true,
        data: {
          customers: pendingCustomers,
          totalCount: pendingCustomers.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'RETRIEVAL_FAILED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  }
}

module.exports = AdminController;