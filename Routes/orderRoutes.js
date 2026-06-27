const express = require('express');
const {
    createOrder,
    getOrders,
    getOrderById,
    cancelOrder,
    updateOrderStatus
} = require('../Controller/orderController');
const { protect } = require('../Middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);
router.put('/:id/status', updateOrderStatus);

module.exports = router;
