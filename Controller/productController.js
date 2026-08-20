const Product = require('../Model/Product');
const cache = require('../Config/cache');

const productListKey = 'products:list';
const productKey = (id) => `product:${id}`;

const invalidateProductCache = async (id) => {
  await cache.del(productListKey, productKey(id));
  await cache.delByPattern('cart:*');
};

const parseSizes = (sizesRaw, fallbackPrice) => {
  let parsed = [];
  if (sizesRaw) {
    try {
      parsed = typeof sizesRaw === 'string' ? JSON.parse(sizesRaw) : sizesRaw;
    } catch {
      parsed = [];
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [{ size: 'Standard', price: Number(fallbackPrice) }];
  }
  return parsed
    .filter((s) => s && s.size && s.size.toString().trim() && !Number.isNaN(Number(s.price)))
    .map((s) => ({ size: s.size.toString().trim(), price: Number(s.price) }));
};

exports.getProducts = async (req, res) => {
  try {
    const cachedProducts = await cache.get(productListKey);
    if (cachedProducts) return res.status(200).json(cachedProducts);

    const products = await Product.find().sort({ createdAt: -1 });
    const responseProducts = products.map((product) => product.toObject());
    await cache.set(productListKey, responseProducts);
    res.status(200).json(responseProducts);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const cachedProduct = await cache.get(productKey(req.params.id));
    if (cachedProduct) return res.status(200).json(cachedProduct);

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const responseProduct = product.toObject();
    await cache.set(productKey(req.params.id), responseProduct);
    res.status(200).json(responseProduct);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, category, description, stock, price } = req.body;
    const sizes = parseSizes(req.body.sizes, price);
    const image = req.file ? require('../Config/imageToDataUrl')(req.file.buffer, req.file.mimetype) : req.body.image;

    if (!name || !category || !description || !stock || !image || sizes.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required product fields' });
    }
    if (sizes.some((s) => s.price <= 0)) {
      return res.status(400).json({ success: false, message: 'Every size must have a price greater than 0' });
    }

    const basePrice = Math.min(...sizes.map((s) => s.price));

    const product = await Product.create({
      owner: req.user.id,
      name: name.trim(),
      price: basePrice,
      category: category.trim(),
      description: description.trim(),
      stock: Number(stock),
      image,
      sizes
    });

    await cache.del(productListKey);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.updateProduct = async (req, res) => {
  try {
    const { name, category, description, stock, price } = req.body;
    const sizes = parseSizes(req.body.sizes, price);
    const updates = {};
    if (name) updates.name = name.trim();
    if (price) updates.price = Number(price);
    if (category) updates.category = category.trim();
    if (description) updates.description = description.trim();
    if (stock) updates.stock = Number(stock);

    if (sizes.length) {
      if (sizes.some((s) => s.price <= 0)) {
        return res.status(400).json({ success: false, message: 'Every size must have a price greater than 0' });
      }

      updates.sizes = sizes;
      updates.price = Math.min(...sizes.map((s) => s.price));
    }

    if (req.file) updates.image = require('../Config/imageToDataUrl')(req.file.buffer, req.file.mimetype);
    if (req.body.image && !req.file) updates.image = req.body.image;
    updates.updatedAt = Date.now();

    // Check existence first so we can distinguish 404 (not found) from 403 (not owner)
    const existing = await Product.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (String(existing.owner) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only edit products you own' });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await invalidateProductCache(req.params.id);
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteProduct = async (req, res) => {
  try {
    // Check existence first so we can distinguish 404 (not found) from 403 (not owner)
    const existing = await Product.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (String(existing.owner) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only delete products you own' });
    }

    const product = await Product.findOneAndDelete({ _id: req.params.id, owner: req.user.id });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    await invalidateProductCache(req.params.id);
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
