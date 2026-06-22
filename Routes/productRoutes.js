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

const { protect } = require('../Middleware/authMiddleware');

router.get('/', getProducts);
router.get('/:id', getProductById);

// Only authenticated users can create/update/delete products.
router.post('/', protect, upload.single('image'), createProduct);
router.put('/:id', protect, upload.single('image'), updateProduct);
router.delete('/:id', protect, deleteProduct);


module.exports = router;
