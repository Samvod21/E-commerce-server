const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      // Denormalized seller id for this line item so we can quickly filter
      // orders visible to a given seller without re-populating the product.
      seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      name: String,
      price: Number,
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      image: String,
      category: String,
      description: String,
      stock: Number
    }
  ],
  customerInfo: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index used by the seller-scoped orders query (GET /api/orders?scope=seller).
orderSchema.index({ 'items.seller': 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
