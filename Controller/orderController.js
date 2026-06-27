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
                seller: product.owner,
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
        const scope = (req.query.scope || '').toString().toLowerCase();

        // Sellers can ask for the orders that contain at least one of their products
        // by passing ?scope=seller. Buyers (and anyone else) get the orders they placed.
        let query;
        if (scope === 'seller' && req.user.role === 'seller') {
            query = { 'items.seller': userId };
        } else {
            query = { user: userId };
        }

        const orders = await Order.find(query).sort({ createdAt: -1 });

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

// @desc    Update an order's status (seller can only update orders containing
//          at least one of their products).
// @route   PUT /api/orders/:id/status
// @access  Private (sellers)
exports.updateOrderStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.body;

        const allowed = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!status || !allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'A valid status is required'
            });
        }

        // Sellers must own at least one item in the order to change its status.
        const order = await Order.findOne({ _id: req.params.id, 'items.seller': userId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const previousStatus = order.status;
        order.status = status;
        order.updatedAt = Date.now();
        await order.save();

        // If the order is moving to cancelled from an active state, restock
        // the items that belonged to this seller (don't touch other sellers' stock).
        if (status === 'cancelled' && (previousStatus === 'pending' || previousStatus === 'processing')) {
            const restoreStockUpdates = order.items
                .filter((item) => String(item.seller) === String(userId))
                .map((item) => ({
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
            message: 'Order status updated',
            order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
