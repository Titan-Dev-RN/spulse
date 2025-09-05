const express = require('express');
const router = express.Router();
const nfcController = require('../controllers/nfcController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all NFC routes
router.use(authMiddleware.verifyToken);

router.post('/read', nfcController.readNfcTag);
router.post('/write', nfcController.writeNfcTag);

module.exports = router;