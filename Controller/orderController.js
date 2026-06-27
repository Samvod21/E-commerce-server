const Order   = require('../Model/Order');
const Cart    = require('../Model/Cart');
const Product = require('../Model/Product');

// ── helpers ───────────────────────────────────────────────────────────────────

function detectCardType(number) {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n))            return 'Visa';
  if (/^5[1-5]/.test(n))      return 'Mastercard';
  if (/^2[2-7]/.test(n))      return 'Mastercard';
  if (/^3[47]/.test(n))       return 'Amex';
  if (/^6(?:011|5)/.test(n))  return 'Discover';
  return 'Card';
}

function validatePayment(p) {
  const errors = [];
  const { cardHolder, cardNumber, expiry, cvv } = p || {};

  if (!cardHolder || !cardHolder.trim()) errors.push('Cardholder name is required');

  const raw = (cardNumber || '').replace(/\D/g, '');
  if (!raw || raw.length < 13 || raw.length > 19) errors.push('A valid card number is required');

  if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry)) {
    errors.push('Expiry must be MM/YY');
  } else {
    const [mm, yy] = expiry.split('/').map(Number);
    const now = new Date(); const fy = 2000 + yy;
    if (mm < 1 || mm > 12) errors.push('Invalid expiry month');
    else if (fy < now.getFullYear() || (fy === now.getFullYear() && mm < now.getMonth() + 1))
      errors.push('Card has expired');
  }

  if (!cvv || !/^\d{3,4}$/.test(cvv)) errors.push('CVV must be 3 or 4 digits');
  return errors;
}

// ── controllers ───────────────────────────────────────────────────────────────

// POST /api/orders
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { customerInfo, paymentInfo } = req.body;

    if (!customerInfo || !customerInfo.name || !customerInfo.email || !customerInfo.address)
      return res.status(400).json({ success: false, message: 'Customer name, email, and address are required' });

    const pErrors = validatePayment(paymentInfo);
    if (pErrors.length) return res.status(400).json({ success: false, message: pErrors.join('. ') });

    const rawCard = (paymentInfo.cardNumber || '').replace(/\D/g, '');
    const safePayment = {
      cardHolder:    paymentInfo.cardHolder.trim(),
      last4:         rawCard.slice(-4),
      cardType:      detectCardType(rawCard),
      expiryDisplay: paymentInfo.expiry
    };

    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ success: false, message: 'Cart is empty.' });

    const orderItems = [];
    let total = 0;

    for (const item of cart.items) {
      const product = item.productId;
      if (!product) return res.status(404).json({ success: false, message: `Product not found for cart item ${item._id}` });
      if (product.stock < item.quantity) return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
      total += product.price * item.quantity;
      orderItems.push({
        product: product._id, seller: product.owner,
        name: product.name, price: product.price, quantity: item.quantity,
        image: product.image, category: product.category, description: product.description, stock: product.stock
      });
    }

    const order = await Order.create({
      user: userId, items: orderItems,
      customerInfo: { name: customerInfo.name.trim(), email: customerInfo.email.trim(), address: customerInfo.address.trim() },
      paymentInfo: safePayment,
      total, status: 'pending'
    });

    const updates = orderItems.map(oi => ({ updateOne: { filter: { _id: oi.product }, update: { $inc: { stock: -oi.quantity } } } }));
    if (updates.length) await Product.bulkWrite(updates);

    cart.items = []; cart.totalItems = 0; cart.totalPrice = 0; cart.updatedAt = Date.now();
    await cart.save();

    res.status(201).json({ success: true, message: 'Order placed successfully', order });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /api/orders
exports.getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const scope  = (req.query.scope || '').toLowerCase();
    const query  = (scope === 'seller' && req.user.role === 'seller') ? { 'items.seller': userId } : { user: userId };
    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, orders });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.status(200).json({ success: true, order });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PUT /api/orders/:id/cancel
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'delivered' || order.status === 'cancelled')
      return res.status(400).json({ success: false, message: `Order cannot be cancelled when status is ${order.status}` });
    const prev = order.status;
    order.status = 'cancelled'; order.updatedAt = Date.now();
    await order.save();
    if (prev === 'pending' || prev === 'processing') {
      const r = order.items.map(i => ({ updateOne: { filter: { _id: i.product }, update: { $inc: { stock: i.quantity } } } }));
      if (r.length) await Product.bulkWrite(r);
    }
    res.status(200).json({ success: true, message: 'Order cancelled', order });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PUT /api/orders/:id/status  (sellers only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const userId = req.user.id; const { status } = req.body;
    const allowed = ['pending','processing','shipped','delivered','cancelled'];
    if (!status || !allowed.includes(status))
      return res.status(400).json({ success: false, message: 'A valid status is required' });
    const order = await Order.findOne({ _id: req.params.id, 'items.seller': userId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const prev = order.status;
    order.status = status; order.updatedAt = Date.now();
    await order.save();
    if (status === 'cancelled' && (prev === 'pending' || prev === 'processing')) {
      const r = order.items.filter(i => String(i.seller) === String(userId))
        .map(i => ({ updateOne: { filter: { _id: i.product }, update: { $inc: { stock: i.quantity } } } }));
      if (r.length) await Product.bulkWrite(r);
    }
    res.status(200).json({ success: true, message: 'Order status updated', order });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
