const Cart = require('../Model/Cart');
const Product = require('../Model/Product');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        let cart = await Cart.findOne({ userId }).populate('items.productId', 'name price image category description');

        if (!cart) {
            return res.status(200).json({
                success: true,
                message: 'Cart is empty',
                cart: {
                    items: [],
                    totalPrice: 0,
                    totalItems: 0
                }
            });
        }

        res.status(200).json({
            success: true,
            cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity, size } = req.body;

        // Validate input
        if (!productId || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Product ID and quantity are required'
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than 0'
            });
        }

        // Check if product exists and get its price
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check stock availability
        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient stock available'
            });
        }

        // Find or create cart
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({
                userId,
                items: [],
                totalPrice: 0,
                totalItems: 0
            });
        }

        // Check if item already in cart
        const existingItem = cart.items.find(
            item => item.productId.toString() === productId && item.size === (size || 'Standard')
        );

        if (existingItem) {
            // Update quantity if item exists
            const newQuantity = existingItem.quantity + quantity;
            if (product.stock < newQuantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient stock for requested quantity'
                });
            }
            existingItem.quantity = newQuantity;
        } else {
            // Add new item
            cart.items.push({
                productId,
                quantity,
                price: product.price,
                size: size || 'Standard'
            });
        }

        // Recalculate totals
        cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        cart.totalPrice = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cart.updatedAt = Date.now();

        await cart.save();

        // Populate product details before returning
        await cart.populate('items.productId', 'name price image category description');

        res.status(200).json({
            success: true,
            message: 'Item added to cart',
            cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/update/:productId
// @access  Private
exports.updateCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;
        const { quantity, size } = req.body;

        if (!quantity) {
            return res.status(400).json({
                success: false,
                message: 'Quantity is required'
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than 0'
            });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Check product stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient stock available'
            });
        }

        // Find and update item
        const itemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId && item.size === (size || 'Standard')
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        cart.items[itemIndex].quantity = quantity;

        // Recalculate totals
        cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        cart.totalPrice = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cart.updatedAt = Date.now();

        await cart.save();
        await cart.populate('items.productId', 'name price image category description');

        res.status(200).json({
            success: true,
            message: 'Cart item updated',
            cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:productId
// @access  Private
exports.removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;
        const { size } = req.query;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Remove item
        const itemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId && item.size === (size || 'Standard')
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        cart.items.splice(itemIndex, 1);

        // If cart is empty, you can either keep it or delete it
        // Here we'll keep it but with zero items
        if (cart.items.length === 0) {
            cart.totalItems = 0;
            cart.totalPrice = 0;
        } else {
            // Recalculate totals
            cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
            cart.totalPrice = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }
        cart.updatedAt = Date.now();

        await cart.save();
        await cart.populate('items.productId', 'name price image category description');

        res.status(200).json({
            success: true,
            message: 'Item removed from cart',
            cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Private
exports.clearCart = async (req, res) => {
    try {
        const userId = req.user.id;

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.items = [];
        cart.totalItems = 0;
        cart.totalPrice = 0;
        cart.updatedAt = Date.now();

        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Cart cleared',
            cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
