const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@gridai.platform';
    this.adminEmail = process.env.ADMIN_EMAIL || 'admin@gridai.platform';
  }

  async sendCustomerApprovalRequest(data) {
    const { companyName, contactEmail, adminName, adminEmail, customerId } = data;

    const mailOptions = {
      from: this.fromEmail,
      to: this.adminEmail,
      subject: `New B2B Customer Registration: ${companyName}`,
      html: `
        <h2>New Customer Registration Pending Approval</h2>
        <p><strong>Company:</strong> ${companyName}</p>
        <p><strong>Contact Email:</strong> ${contactEmail}</p>
        <p><strong>Admin Name:</strong> ${adminName}</p>
        <p><strong>Admin Email:</strong> ${adminEmail}</p>
        <p><strong>Customer ID:</strong> ${customerId}</p>
        <br>
        <p>Please review and approve this registration in the admin portal.</p>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Customer approval request email sent');
    } catch (error) {
      console.error('Failed to send approval request email:', error);
      throw error;
    }
  }

  async sendRegistrationPending(data) {
    const { to, companyName, adminName } = data;

    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: 'Grid AI Platform - Registration Pending Approval',
      html: `
        <h2>Welcome to Grid AI Platform</h2>
        <p>Dear ${adminName},</p>
        <p>Thank you for registering ${companyName} with Grid AI Platform.</p>
        <p>Your registration is currently pending approval by our team. You will receive an email with your login credentials once your account has been approved.</p>
        <p>This typically takes 1-2 business days.</p>
        <br>
        <p>If you have any questions, please contact our support team.</p>
        <p>Best regards,<br>Grid AI Platform Team</p>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Registration pending email sent');
    } catch (error) {
      console.error('Failed to send registration pending email:', error);
      throw error;
    }
  }

  async sendAccountApproved(data) {
    const { to, companyName, adminName, loginUrl } = data;

    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: 'Grid AI Platform - Account Approved',
      html: `
        <h2>Your Account Has Been Approved!</h2>
        <p>Dear ${adminName},</p>
        <p>Great news! Your Grid AI Platform account for ${companyName} has been approved.</p>
        <p>You can now log in at: <a href="${loginUrl}">${loginUrl}</a></p>
        <p><strong>Important:</strong> On your first login, you will be required to set up multi-factor authentication (MFA) for enhanced security.</p>
        <br>
        <p>Welcome aboard!</p>
        <p>Best regards,<br>Grid AI Platform Team</p>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Account approved email sent');
    } catch (error) {
      console.error('Failed to send account approved email:', error);
      throw error;
    }
  }
}

module.exports = EmailService;