const { v4: uuidv4 } = require('uuid');
const { Report } = require('../models');
const { addReportJob } = require('../services/queueService');

class ReportController {
  async triggerReport(req, res) {
    try {
      const reportId = uuidv4();
      
      // Create report record in database
      const report = await Report.create({
        report_id: reportId,
        status: 'Running'
      });

      // Add job to background queue
      await addReportJob(reportId);

      res.json({
        message: 'Report generation started',
        report_id: reportId
      });
    } catch (error) {
      console.error('Error triggering report:', error);
      res.status(500).json({
        error: 'Failed to trigger report generation'
      });
    }
  }

  async getReport(req, res) {
    try {
      const { report_id } = req.params;

      const report = await Report.findOne({
        where: { report_id }
      });

      if (!report) {
        return res.status(404).json({
          error: 'Report not found'
        });
      }

      if (report.status === 'Running') {
        return res.json({
          status: 'Running'
        });
      }

      if (report.status === 'Failed') {
        return res.json({
          status: 'Failed',
          error: report.error_message
        });
      }

      if (report.status === 'Complete') {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const downloadLink = `${baseUrl}/reports/${report.report_id}.csv`;
        
        return res.json({
          status: 'Complete',
          csv_download_link: downloadLink
        });
      }

    } catch (error) {
      console.error('Error getting report:', error);
      res.status(500).json({
        error: 'Failed to retrieve report'
      });
    }
  }
}

module.exports = new ReportController();