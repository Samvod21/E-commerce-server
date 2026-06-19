const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: 0
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  stock: {
    type: Number,
    required: [true, 'Product stock is required'],
    min: 0,
    default: 0
  },
  sizes: {
    type: [String],
    default: ['Standard']
  },
  // Store image as a data URL so we don't need a local /uploads folder
  image: {
    type: String,
    required: [true, 'Product image URL is required']
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

module.exports = mongoose.model('Product', productSchema);
