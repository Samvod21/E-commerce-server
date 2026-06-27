const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    seller:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: String, price: Number,
    quantity: { type: Number, required: true, min: 1 },
    image: String, category: String, description: String, stock: Number
  }],
  customerInfo: {
    name:    { type: String, required: true },
    email:   { type: String, required: true },
    address: { type: String, required: true }
  },
  // Simulated payment — raw card number and CVV are NEVER stored.
  paymentInfo: {
    cardHolder:    { type: String, required: true },
    last4:         { type: String, required: true },
    cardType:      { type: String, required: true },
    expiryDisplay: { type: String, required: true }
  },
  total:     { type: Number, required: true, min: 0 },
  orderDate: { type: Date,   default: Date.now },
  status: {
    type: String,
    enum: ['pending','processing','shipped','delivered','cancelled'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

orderSchema.index({ 'items.seller': 1, createdAt: -1 });
module.exports = mongoose.model('Order', orderSchema);
