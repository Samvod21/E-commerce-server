const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../Controller/productController');

const upload = require('../Config/multerMemoryStorage');
const router = express.Router();

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', upload.single('image'), createProduct);
router.put('/:id', upload.single('image'), updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
