const { ProductCategory, Product } = require('../../models');
const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../../utils/constants');
const { Op } = require('sequelize');

// Category Controllers
const getCategories = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, isActive } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = { businessId: req.user.id };

  if (search) {
    whereClause.name = { [Op.like]: `%${search}%` };
  }

  if (isActive !== undefined) {
    whereClause.isActive = isActive === 'true';
  }

  const { count, rows: categories } = await ProductCategory.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: Product,
        as: 'products',
        attributes: ['id'],
        required: false
      }
    ]
  });

  // Add product count to each category
  const categoriesWithCount = categories.map(category => ({
    ...category.toJSON(),
    productCount: category.products ? category.products.length : 0,
    products: undefined // Remove products array from response
  }));

  res.status(200).json({
    success: true,
    message: 'Categories retrieved successfully',
    data: {
      categories: categoriesWithCount,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(count / limit),
        count,
        perPage: parseInt(limit)
      }
    }
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // Check if category already exists for this business
  const existingCategory = await ProductCategory.findOne({
    where: {
      businessId: req.user.id,
      name: { [Op.like]: name }
    }
  });

  if (existingCategory) {
    throw new AppError('Category with this name already exists', 400, ERROR_CODES.DUPLICATE_ENTRY);
  }

  const category = await ProductCategory.create({
    businessId: req.user.id,
    name,
    description
  });

  res.status(201).json({
    success: true,
    message: RESPONSE_MESSAGES.CREATED,
    data: { category }
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  const category = await ProductCategory.findOne({
    where: {
      id,
      businessId: req.user.id
    }
  });

  if (!category) {
    throw new AppError(RESPONSE_MESSAGES.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  // Check if name is being changed and if it already exists
  if (name && name !== category.name) {
    const existingCategory = await ProductCategory.findOne({
      where: {
        businessId: req.user.id,
        name: { [Op.like]: name },
        id: { [Op.ne]: id }
      }
    });

    if (existingCategory) {
      throw new AppError('Category with this name already exists', 400, ERROR_CODES.DUPLICATE_ENTRY);
    }
  }

  await category.update({
    name: name || category.name,
    description: description !== undefined ? description : category.description,
    isActive: isActive !== undefined ? isActive : category.isActive
  });

  res.status(200).json({
    success: true,
    message: RESPONSE_MESSAGES.UPDATED,
    data: { category }
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await ProductCategory.findOne({
    where: {
      id,
      businessId: req.user.id
    }
  });

  if (!category) {
    throw new AppError(RESPONSE_MESSAGES.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  // Check if category has products
  const productCount = await Product.count({
    where: { categoryId: id }
  });

  if (productCount > 0) {
    throw new AppError('Cannot delete category with existing products', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  await category.destroy();

  res.status(200).json({
    success: true,
    message: RESPONSE_MESSAGES.DELETED,
    data: null
  });
});

// Product Controllers
const getProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, categoryId, isAvailable } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = { businessId: req.user.id };

  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { sku: { [Op.like]: `%${search}%` } }
    ];
  }

  if (categoryId) {
    whereClause.categoryId = categoryId;
  }

  if (isAvailable !== undefined) {
    whereClause.isAvailable = isAvailable === 'true';
  }

  const { count, rows: products } = await Product.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: ProductCategory,
        as: 'category',
        attributes: ['id', 'name']
      }
    ]
  });

  res.status(200).json({
    success: true,
    message: 'Products retrieved successfully',
    data: {
      products,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(count / limit),
        count,
        perPage: parseInt(limit)
      }
    }
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const { categoryId, name, description, price, sku, stock, isAvailable } = req.body;

  // Verify category belongs to business
  const category = await ProductCategory.findOne({
    where: {
      id: categoryId,
      businessId: req.user.id,
      isActive: true
    }
  });

  if (!category) {
    throw new AppError('Category not found or inactive', 404, ERROR_CODES.NOT_FOUND);
  }

  // Check if SKU already exists for this business
  const existingProduct = await Product.findOne({
    where: {
      businessId: req.user.id,
      sku
    }
  });

  if (existingProduct) {
    throw new AppError('Product with this SKU already exists', 400, ERROR_CODES.DUPLICATE_ENTRY);
  }

  const product = await Product.create({
    businessId: req.user.id,
    categoryId,
    name,
    description,
    price,
    sku,
    stock: stock || 0,
    isAvailable: isAvailable !== undefined ? isAvailable : true
  });

  // Fetch the created product with category info
  const productWithCategory = await Product.findByPk(product.id, {
    include: [
      {
        model: ProductCategory,
        as: 'category',
        attributes: ['id', 'name']
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: RESPONSE_MESSAGES.CREATED,
    data: { product: productWithCategory }
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { categoryId, name, description, price, sku, stock, isAvailable } = req.body;

  const product = await Product.findOne({
    where: {
      id,
      businessId: req.user.id
    }
  });

  if (!product) {
    throw new AppError(RESPONSE_MESSAGES.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  // If categoryId is being changed, verify it belongs to business
  if (categoryId && categoryId !== product.categoryId) {
    const category = await ProductCategory.findOne({
      where: {
        id: categoryId,
        businessId: req.user.id,
        isActive: true
      }
    });

    if (!category) {
      throw new AppError('Category not found or inactive', 404, ERROR_CODES.NOT_FOUND);
    }
  }

  // Check if SKU is being changed and if it already exists
  if (sku && sku !== product.sku) {
    const existingProduct = await Product.findOne({
      where: {
        businessId: req.user.id,
        sku,
        id: { [Op.ne]: id }
      }
    });

    if (existingProduct) {
      throw new AppError('Product with this SKU already exists', 400, ERROR_CODES.DUPLICATE_ENTRY);
    }
  }

  await product.update({
    categoryId: categoryId || product.categoryId,
    name: name || product.name,
    description: description !== undefined ? description : product.description,
    price: price !== undefined ? price : product.price,
    sku: sku || product.sku,
    stock: stock !== undefined ? stock : product.stock,
    isAvailable: isAvailable !== undefined ? isAvailable : product.isAvailable
  });

  // Fetch updated product with category info
  const updatedProduct = await Product.findByPk(id, {
    include: [
      {
        model: ProductCategory,
        as: 'category',
        attributes: ['id', 'name']
      }
    ]
  });

  res.status(200).json({
    success: true,
    message: RESPONSE_MESSAGES.UPDATED,
    data: { product: updatedProduct }
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findOne({
    where: {
      id,
      businessId: req.user.id
    }
  });

  if (!product) {
    throw new AppError(RESPONSE_MESSAGES.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  await product.destroy();

  res.status(200).json({
    success: true,
    message: RESPONSE_MESSAGES.DELETED,
    data: null
  });
});

const updateStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  const product = await Product.findOne({
    where: {
      id,
      businessId: req.user.id
    }
  });

  if (!product) {
    throw new AppError(RESPONSE_MESSAGES.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  await product.update({ stock });

  res.status(200).json({
    success: true,
    message: 'Stock updated successfully',
    data: {
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        stock: stock
      }
    }
  });
});

module.exports = {
  // Categories
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,

  // Products
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock
};