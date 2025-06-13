const Queue = require('bull');
const Redis = require('redis');
const reportGenerationService = require('./reportGenerationService');

let reportQueue;
let redisClient;

async function initializeQueue() {
  try {
    // Create Redis client
    redisClient = Redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });

    await redisClient.connect();
    
    // Create Bull queue
    reportQueue = new Queue('report generation', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      }
    });

    // Process jobs
    reportQueue.process('generate-report', 1, async (job) => {
      const { reportId } = job.data;
      console.log(`Processing report generation for ID: ${reportId}`);
      
      try {
        await reportGenerationService.generateReport(reportId);
        console.log(`Report generation completed for ID: ${reportId}`);
      } catch (error) {
        console.error(`Report generation failed for ID: ${reportId}`, error);
        throw error;
      }
    });

    // Handle job events
    reportQueue.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    reportQueue.on('failed', (job, err) => {
      console.error(`Job ${job.id} failed:`, err);
    });

    console.log('Queue service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize queue service:', error);
    
    // Fallback to in-memory processing if Redis is not available
    console.log('Falling back to in-memory job processing');
    reportQueue = null;
  }
}

async function addReportJob(reportId) {
  if (reportQueue) {
    return await reportQueue.add('generate-report', { reportId }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });
  } else {
    // Fallback: process immediately without queue
    setTimeout(async () => {
      try {
        await reportGenerationService.generateReport(reportId);
      } catch (error) {
        console.error(`Report generation failed for ID: ${reportId}`, error);
      }
    }, 0);
  }
}

module.exports = {
  initializeQueue,
  addReportJob
};