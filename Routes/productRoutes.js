const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../Controller/productController');

const uploadDirectory = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9\.\-_]/g, '-');
    cb(null, `${timestamp}-${sanitizedFilename}`);
  }
});

const upload = multer({ storage });
const router = express.Router();

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', upload.single('image'), createProduct);
router.put('/:id', upload.single('image'), updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
