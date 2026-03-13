const cron = require('node-cron');
const { 
  isKeyRotationDue, 
  rotateEncryptionKey,
  getCurrentKeyVersion,
  getKeyRotationDate,
} = require('../utils/encryption');
const logger = require('../utils/logger');

/**
 * Checks if encryption key rotation is needed and triggers rotation
 * Runs daily at 2 AM
 */
function scheduleKeyRotationCheck() {
  // Run daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Running encryption key rotation check', {
        currentVersion: getCurrentKeyVersion(),
        lastRotation: getKeyRotationDate().toISOString(),
      });
      
      if (isKeyRotationDue()) {
        logger.warn('Encryption key rotation is due (90-day policy)', {
          currentVersion: getCurrentKeyVersion(),
          daysSinceRotation: Math.floor(
            (Date.now() - getKeyRotationDate().getTime()) / (1000 * 60 * 60 * 24)
          ),
        });
        
        // In production, this would:
        // 1. Retrieve new key from HashiCorp Vault
        // 2. Trigger automated key rotation
        // 3. Send alerts to security team
        // 4. Schedule background job to re-encrypt old data
        
        // For now, log warning for manual intervention
        logger.warn('Manual key rotation required - contact security team');
        
        // Send alert (placeholder - integrate with PagerDuty/Slack)
        await sendKeyRotationAlert();
      } else {
        logger.info('Encryption key rotation not needed', {
          currentVersion: getCurrentKeyVersion(),
          nextRotationDue: new Date(
            getKeyRotationDate().getTime() + 90 * 24 * 60 * 60 * 1000
          ).toISOString(),
        });
      }
    } catch (error) {
      logger.error('Key rotation check failed', { error: error.message });
    }
  });
  
  logger.info('Key rotation check scheduled (daily at 2 AM)');
}

/**
 * Sends alert when key rotation is due
 */
async function sendKeyRotationAlert() {
  // Placeholder for alert integration
  // In production: integrate with PagerDuty, Slack, email
  logger.warn('KEY ROTATION ALERT: Encryption key rotation required within 7 days', {
    currentVersion: getCurrentKeyVersion(),
    rotationDueDate: new Date(
      getKeyRotationDate().getTime() + 90 * 24 * 60 * 60 * 1000
    ).toISOString(),
  });
}

/**
 * Manual key rotation trigger (for admin use)
 * @param {string} newMasterKey - New master encryption key
 */
async function triggerManualKeyRotation(newMasterKey) {
  try {
    logger.info('Manual key rotation triggered', {
      currentVersion: getCurrentKeyVersion(),
    });
    
    rotateEncryptionKey(newMasterKey);
    
    logger.info('Key rotation completed successfully', {
      newVersion: getCurrentKeyVersion(),
      rotationDate: getKeyRotationDate().toISOString(),
    });
    
    // Schedule background job to re-encrypt old data
    // (would be implemented as separate batch job)
    logger.info('Background re-encryption job should be scheduled');
    
    return {
      success: true,
      newVersion: getCurrentKeyVersion(),
      rotationDate: getKeyRotationDate(),
    };
  } catch (error) {
    logger.error('Manual key rotation failed', { error: error.message });
    throw error;
  }
}

module.exports = {
  scheduleKeyRotationCheck,
  triggerManualKeyRotation,
};