const multer = require('multer');

// Store uploaded images in memory (no local uploads folder)
// Controller will convert to base64 and persist to Mongo.
module.exports = multer({ storage: multer.memoryStorage() });

