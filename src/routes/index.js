const express = require('express');
const reportRoutes = require('./reportRoutes');
const uploadRoutes = require('./uploadRoutes');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'API is working properly ✅' });
});

// Mount route modules
router.use('/', reportRoutes);
router.use('/upload', uploadRoutes);

router.get('/test', (req, res) => {
  res.json({ message: 'Routes working ✅' });
});

module.exports = router;