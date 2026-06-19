const Product = require('../Model/Product');

const parseSizes = (sizes) => {
  // Handle both 'sizes' and 'sizes[]' keys sent by FormData
  if (!sizes) return ['Standard'];
  if (Array.isArray(sizes)) return sizes.filter(Boolean);
  if (typeof sizes === 'string') {
    try {
      const parsed = JSON.parse(sizes);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
      return [parsed].filter(Boolean);
    } catch {
      return sizes.split(',').map(item => item.trim()).filter(Boolean);
    }
  }
  return ['Standard'];
};

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, price, category, description, stock } = req.body;
    const sizes = parseSizes(req.body['sizes[]'] || req.body.sizes);
    const image = req.file ? require('../Config/imageToDataUrl')(req.file.buffer, req.file.mimetype) : req.body.image;

    if (!name || !price || !category || !description || !stock || !image) {
      return res.status(400).json({ success: false, message: 'Missing required product fields' });
    }

    const product = await Product.create({
      name: name.trim(),
      price: Number(price),
      category: category.trim(),
      description: description.trim(),
      stock: Number(stock),
      image,
      sizes
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, price, category, description, stock } = req.body;
    const sizes = parseSizes(req.body['sizes[]'] || req.body.sizes);
    const updates = {};
    if (name) updates.name = name.trim();
    if (price) updates.price = Number(price);
    if (category) updates.category = category.trim();
    if (description) updates.description = description.trim();
    if (stock) updates.stock = Number(stock);
    if (sizes.length) updates.sizes = sizes;
    if (req.file) updates.image = require('../Config/imageToDataUrl')(req.file.buffer, req.file.mimetype);
    if (req.body.image && !req.file) updates.image = req.body.image;
    updates.updatedAt = Date.now();

    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
