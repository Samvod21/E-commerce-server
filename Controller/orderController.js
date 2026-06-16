const Order = require('../Model/Order');
const Cart = require('../Model/Cart');
const Product = require('../Model/Product');

// @desc    Create a new order from user cart
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { customerInfo } = req.body;

        if (!customerInfo || !customerInfo.name || !customerInfo.email || !customerInfo.address) {
            return res.status(400).json({
                success: false,
                message: 'Customer name, email, and address are required'
            });
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty. Add items before placing an order.'
            });
        }

        const orderItems = [];
        let total = 0;

        for (const item of cart.items) {
            const product = item.productId;
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product not found for cart item ${item._id}`
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}`
                });
            }

            const itemTotal = product.price * item.quantity;
            total += itemTotal;

            orderItems.push({
                product: product._id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                image: product.image,
                category: product.category,
                description: product.description,
                stock: product.stock
            });
        }

        const order = await Order.create({
            user: userId,
            items: orderItems,
            customerInfo: {
                name: customerInfo.name.trim(),
                email: customerInfo.email.trim(),
                address: customerInfo.address.trim()
            },
            total,
            status: 'pending'
        });

        const productUpdates = orderItems.map((orderItem) => ({
            updateOne: {
                filter: { _id: orderItem.product },
                update: { $inc: { stock: -orderItem.quantity } }
            }
        }));

        if (productUpdates.length) {
            await Product.bulkWrite(productUpdates);
        }

        cart.items = [];
        cart.totalItems = 0;
        cart.totalPrice = 0;
        cart.updatedAt = Date.now();
        await cart.save();

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get current user orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get a single order by id
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
    try {
        const userId = req.user.id;
        const order = await Order.findOne({ _id: req.params.id, user: userId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Cancel an order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const order = await Order.findOne({ _id: req.params.id, user: userId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.status === 'delivered' || order.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: `Order cannot be cancelled when status is ${order.status}`
            });
        }

        const previousStatus = order.status;
        order.status = 'cancelled';
        order.updatedAt = Date.now();
        await order.save();

        if (previousStatus === 'pending' || previousStatus === 'processing') {
            const restoreStockUpdates = order.items.map((item) => ({
                updateOne: {
                    filter: { _id: item.product },
                    update: { $inc: { stock: item.quantity } }
                }
            }));

            if (restoreStockUpdates.length) {
                await Product.bulkWrite(restoreStockUpdates);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
