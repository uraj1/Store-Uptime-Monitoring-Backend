const express = require('express');
const reportRoutes = require('./reportRoutes');
const uploadRoutes = require('./uploadRoutes');

const router = express.Router();

// Mount route modules
router.use('/', reportRoutes);
router.use('/upload', uploadRoutes);

module.exports = router;