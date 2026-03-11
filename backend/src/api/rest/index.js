const express = require('express');
const weatherRoutes = require('./weather.routes');
const gridRoutes = require('./grid.routes');
const bessRoutes = require('./bess.routes');

const router = express.Router();

// Mount API routes
router.use('/weather', weatherRoutes);
router.use('/grid', gridRoutes);
router.use('/bess', bessRoutes);

module.exports = router;