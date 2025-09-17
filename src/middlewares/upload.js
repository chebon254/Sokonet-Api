const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Memory storage for processing before uploading to S3
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WEBP) are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

const processImage = async (file, options = {}) => {
  const {
    width = 800,
    height = 800,
    quality = 80,
    format = 'webp'
  } = options;

  try {
    const processedImage = await sharp(file.buffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFormat(format, { quality })
      .toBuffer();

    return {
      buffer: processedImage,
      mimetype: `image/${format}`,
      filename: `${uuidv4()}.${format}`
    };
  } catch (error) {
    throw new Error('Image processing failed: ' + error.message);
  }
};

const generateImageSizes = async (file) => {
  const sizes = {
    thumbnail: { width: 150, height: 150 },
    medium: { width: 400, height: 400 },
    large: { width: 800, height: 800 }
  };

  const results = {};
  
  for (const [size, dimensions] of Object.entries(sizes)) {
    try {
      const processed = await sharp(file.buffer)
        .resize(dimensions.width, dimensions.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFormat('webp', { quality: 80 })
        .toBuffer();

      results[size] = {
        buffer: processed,
        filename: `${size}_${uuidv4()}.webp`
      };
    } catch (error) {
      console.error(`Failed to generate ${size} image:`, error);
    }
  }

  return results;
};

module.exports = {
  upload,
  processImage,
  generateImageSizes
};