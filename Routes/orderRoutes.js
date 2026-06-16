const express = require('express');
const {
    createOrder,
    getOrders,
    getOrderById,
    cancelOrder
} = require('../Controller/orderController');
const { protect } = require('../Middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);

module.exports = router;
