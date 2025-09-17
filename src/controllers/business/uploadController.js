const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../../utils/constants');
const { uploadToSpaces, deleteFromSpaces } = require('../../config/digitalocean');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    spreadsheet: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
  };

  const allAllowedMimes = Object.values(allowedMimes).flat();

  if (allAllowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('File type not supported', 400, ERROR_CODES.VALIDATION_ERROR), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files at once
  }
});

const uploadSingleFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file provided', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const { category = 'general', subfolder = '' } = req.body;
  const businessId = req.user.id;

  const fileExtension = path.extname(req.file.originalname);
  const filename = `${uuidv4()}${fileExtension}`;
  const folderPath = subfolder
    ? `${category}/${businessId}/${subfolder}`
    : `${category}/${businessId}`;

  try {
    const fileUrl = await uploadToSpaces(req.file, folderPath, filename);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileUrl,
        filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        category,
        subfolder
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    throw new AppError('Failed to upload file', 500, ERROR_CODES.UPLOAD_ERROR);
  }
});

const uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('No files provided', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const { category = 'general', subfolder = '' } = req.body;
  const businessId = req.user.id;
  const uploadedFiles = [];

  try {
    for (const file of req.files) {
      const fileExtension = path.extname(file.originalname);
      const filename = `${uuidv4()}${fileExtension}`;
      const folderPath = subfolder
        ? `${category}/${businessId}/${subfolder}`
        : `${category}/${businessId}`;

      const fileUrl = await uploadToSpaces(file, folderPath, filename);

      uploadedFiles.push({
        fileUrl,
        filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });
    }

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      data: {
        files: uploadedFiles,
        category,
        subfolder,
        count: uploadedFiles.length
      }
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    throw new AppError('Failed to upload files', 500, ERROR_CODES.UPLOAD_ERROR);
  }
});

const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No image file provided', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  if (!req.file.mimetype.startsWith('image/')) {
    throw new AppError('Only image files are allowed', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const businessId = req.user.id;
  const { productId } = req.params;

  const fileExtension = path.extname(req.file.originalname);
  const filename = `product_${productId}_${uuidv4()}${fileExtension}`;
  const folderPath = `products/${businessId}`;

  try {
    const imageUrl = await uploadToSpaces(req.file, folderPath, filename);

    res.status(201).json({
      success: true,
      message: 'Product image uploaded successfully',
      data: {
        imageUrl,
        filename,
        productId,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Product image upload error:', error);
    throw new AppError('Failed to upload product image', 500, ERROR_CODES.UPLOAD_ERROR);
  }
});

const uploadBusinessLogo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No logo file provided', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  if (!req.file.mimetype.startsWith('image/')) {
    throw new AppError('Only image files are allowed for logo', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const businessId = req.user.id;

  const fileExtension = path.extname(req.file.originalname);
  const filename = `logo_${uuidv4()}${fileExtension}`;
  const folderPath = `logos/${businessId}`;

  try {
    const logoUrl = await uploadToSpaces(req.file, folderPath, filename);

    res.status(201).json({
      success: true,
      message: 'Business logo uploaded successfully',
      data: {
        logoUrl,
        filename,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    throw new AppError('Failed to upload business logo', 500, ERROR_CODES.UPLOAD_ERROR);
  }
});

const deleteFile = asyncHandler(async (req, res) => {
  const { fileUrl } = req.body;

  if (!fileUrl) {
    throw new AppError('File URL is required', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const businessId = req.user.id;

  // Extract file path from URL and verify it belongs to this business
  try {
    const url = new URL(fileUrl);
    const filePath = url.pathname.substring(1); // Remove leading slash

    if (!filePath.includes(`/${businessId}/`)) {
      throw new AppError('Unauthorized file access', 403, ERROR_CODES.UNAUTHORIZED);
    }

    await deleteFromSpaces(filePath);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      data: { deletedUrl: fileUrl }
    });
  } catch (error) {
    if (error instanceof AppError) throw error;

    console.error('File deletion error:', error);
    throw new AppError('Failed to delete file', 500, ERROR_CODES.DELETE_ERROR);
  }
});

const getUploadedFiles = asyncHandler(async (req, res) => {
  const { category, subfolder, page = 1, limit = 20 } = req.query;
  const businessId = req.user.id;

  // This would typically query a database table that tracks uploaded files
  // For now, return a placeholder response
  res.status(200).json({
    success: true,
    message: 'File listing not implemented yet',
    data: {
      files: [],
      pagination: {
        current: parseInt(page),
        total: 0,
        count: 0,
        perPage: parseInt(limit)
      },
      filters: {
        category,
        subfolder
      }
    }
  });
});

module.exports = {
  upload,
  uploadSingleFile,
  uploadMultipleFiles,
  uploadProductImage,
  uploadBusinessLogo,
  deleteFile,
  getUploadedFiles
};