const express = require('express');
const reportController = require('../controllers/reportController');
const { validateReportId } = require('../middleware/validation');

const router = express.Router();

// Trigger report generation
router.post('/trigger_report', reportController.triggerReport);

// Get report status and download link
router.get('/get_report/:report_id', validateReportId, reportController.getReport);

module.exports = router;