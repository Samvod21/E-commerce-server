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

const { protect, sellerOnly } = require('../Middleware/authMiddleware');

router.get('/', getProducts);
router.get('/:id', getProductById);

// Only authenticated sellers can create/update/delete products.
// The controller additionally enforces that update/delete only affect products owned by the requester.
router.post('/', protect, sellerOnly, upload.single('image'), createProduct);
router.put('/:id', protect, sellerOnly, upload.single('image'), updateProduct);
router.delete('/:id', protect, sellerOnly, deleteProduct);


module.exports = router;
