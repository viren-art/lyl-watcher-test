const AWS = require('aws-sdk');
const rds = new AWS.RDS();
const sns = new AWS.SNS();

exports.handler = async (event) => {
  console.log('Database failover triggered:', JSON.stringify(event, null, 2));
  
  const primaryInstance = process.env.PRIMARY_DB_INSTANCE;
  const replicaWestInstance = process.env.REPLICA_WEST_INSTANCE;
  const replicaCentralInstance = process.env.REPLICA_CENTRAL_INSTANCE;
  const snsTopicArn = process.env.SNS_TOPIC_ARN;
  
  try {
    // Check primary instance status
    const primaryStatus = await rds.describeDBInstances({
      DBInstanceIdentifier: primaryInstance
    }).promise();
    
    const primaryState = primaryStatus.DBInstances[0].DBInstanceStatus;
    
    if (primaryState === 'available') {
      console.log('Primary database is available. No failover needed.');
      return { statusCode: 200, body: 'Primary healthy' };
    }
    
    console.log(`Primary database status: ${primaryState}. Initiating failover...`);
    
    // Check replica lag before promotion
    const replicaWestStatus = await rds.describeDBInstances({
      DBInstanceIdentifier: replicaWestInstance
    }).promise();
    
    const replicaLag = replicaWestStatus.DBInstances[0].StatusInfos?.find(
      info => info.StatusType === 'read replication'
    );
    
    if (replicaLag && replicaLag.Status === 'replicating') {
      // Promote replica to primary
      console.log(`Promoting replica ${replicaWestInstance} to primary...`);
      
      await rds.promoteReadReplica({
        DBInstanceIdentifier: replicaWestInstance,
        BackupRetentionPeriod: 30
      }).promise();
      
      // Send SNS notification
      await sns.publish({
        TopicArn: snsTopicArn,
        Subject: 'CRITICAL: Database Failover Executed',
        Message: JSON.stringify({
          event: 'database_failover',
          timestamp: new Date().toISOString(),
          primary_instance: primaryInstance,
          promoted_replica: replicaWestInstance,
          primary_status: primaryState,
          action: 'Replica promoted to primary'
        }, null, 2)
      }).promise();
      
      console.log('Failover completed successfully');
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Failover completed',
          promotedReplica: replicaWestInstance
        })
      };
    } else {
      throw new Error('Replica not ready for promotion (replication lag or not replicating)');
    }
  } catch (error) {
    console.error('Failover failed:', error);
    
    // Send failure notification
    await sns.publish({
      TopicArn: snsTopicArn,
      Subject: 'CRITICAL: Database Failover Failed',
      Message: JSON.stringify({
        event: 'database_failover_failed',
        timestamp: new Date().toISOString(),
        error: error.message,
        primary_instance: primaryInstance
      }, null, 2)
    }).promise();
    
    throw error;
  }
};