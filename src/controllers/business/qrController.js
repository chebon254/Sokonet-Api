const { QRCode } = require('../../models');
const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../../utils/constants');
const qrService = require('../../services/qrService');
const { uploadToSpaces } = require('../../config/digitalocean');
const { Op } = require('sequelize');

const generateQRCodes = asyncHandler(async (req, res) => {
  const { quantity = 1 } = req.body;
  const businessId = req.user.id;

  if (quantity < 1 || quantity > 100) {
    throw new AppError('Quantity must be between 1 and 100', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  // Generate bulk QR codes without PDF dependency
  const qrCodesData = await qrService.generateBulkQRCodes(businessId, quantity);

  // Save QR codes to database
  const qrCodes = await QRCode.bulkCreate(
    qrCodesData.map(qr => ({
      businessId,
      code: qr.code,
      qrData: qr.qrData,
      imageUrl: qr.imageUrl
    }))
  );

  res.status(201).json({
    success: true,
    message: `${quantity} QR codes generated successfully`,
    data: {
      qrCodes: qrCodes.map(qr => ({
        id: qr.id,
        code: qr.code,
        imageUrl: qr.imageUrl,
        isActive: qr.isActive,
        createdAt: qr.createdAt
      })),
      count: qrCodes.length
    }
  });
});

const getQRCodes = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    isActive,
    isAssigned,
    isPrinted
  } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = { businessId: req.user.id };

  if (search) {
    whereClause.code = { [Op.like]: `%${search}%` };
  }

  if (isActive !== undefined) {
    whereClause.isActive = isActive === 'true';
  }

  if (isAssigned !== undefined) {
    if (isAssigned === 'true') {
      whereClause.userId = { [Op.not]: null };
    } else {
      whereClause.userId = null;
    }
  }

  if (isPrinted !== undefined) {
    whereClause.isPrinted = isPrinted === 'true';
  }

  const { count, rows: qrCodes } = await QRCode.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']],
    attributes: [
      'id', 'code', 'imageUrl', 'userId', 'assignedAt',
      'isActive', 'isPrinted', 'printedAt', 'scannedCount',
      'lastScannedAt', 'createdAt'
    ]
  });

  res.status(200).json({
    success: true,
    message: 'QR codes retrieved successfully',
    data: {
      qrCodes,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(count / limit),
        count,
        perPage: parseInt(limit)
      },
      stats: {
        total: count,
        assigned: qrCodes.filter(qr => qr.userId).length,
        unassigned: qrCodes.filter(qr => !qr.userId).length,
        printed: qrCodes.filter(qr => qr.isPrinted).length
      }
    }
  });
});

const assignQRCode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    throw new AppError('User ID is required', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const qrCode = await QRCode.findOne({
    where: {
      id,
      businessId: req.user.id
    }
  });

  if (!qrCode) {
    throw new AppError(RESPONSE_MESSAGES.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  if (qrCode.userId) {
    throw new AppError('QR code is already assigned', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  // Check if user already has a QR code assigned
  const existingAssignment = await QRCode.findOne({
    where: {
      businessId: req.user.id,
      userId
    }
  });

  if (existingAssignment) {
    throw new AppError('User already has a QR code assigned', 400, ERROR_CODES.DUPLICATE_ENTRY);
  }

  await qrCode.update({
    userId,
    assignedAt: new Date(),
    assignedBy: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'QR code assigned successfully',
    data: {
      qrCode: {
        id: qrCode.id,
        code: qrCode.code,
        userId: qrCode.userId,
        assignedAt: qrCode.assignedAt
      }
    }
  });
});

const unassignQRCode = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const qrCode = await QRCode.findOne({
    where: {
      id,
      businessId: req.user.id
    }
  });

  if (!qrCode) {
    throw new AppError(RESPONSE_MESSAGES.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  if (!qrCode.userId) {
    throw new AppError('QR code is not assigned', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  await qrCode.update({
    userId: null,
    assignedAt: null,
    assignedBy: null
  });

  res.status(200).json({
    success: true,
    message: 'QR code unassigned successfully',
    data: {
      qrCode: {
        id: qrCode.id,
        code: qrCode.code
      }
    }
  });
});

const toggleQRCodeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    throw new AppError('isActive must be a boolean value', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const qrCode = await QRCode.findOne({
    where: {
      id,
      businessId: req.user.id
    }
  });

  if (!qrCode) {
    throw new AppError(RESPONSE_MESSAGES.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  await qrCode.update({ isActive });

  res.status(200).json({
    success: true,
    message: `QR code ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      qrCode: {
        id: qrCode.id,
        code: qrCode.code,
        isActive: qrCode.isActive
      }
    }
  });
});

const getQRCodeStats = asyncHandler(async (req, res) => {
  const businessId = req.user.id;

  const [
    totalQRCodes,
    assignedQRCodes,
    printedQRCodes,
    activeQRCodes,
    totalScans
  ] = await Promise.all([
    QRCode.count({ where: { businessId } }),
    QRCode.count({ where: { businessId, userId: { [Op.not]: null } } }),
    QRCode.count({ where: { businessId, isPrinted: true } }),
    QRCode.count({ where: { businessId, isActive: true } }),
    QRCode.sum('scannedCount', { where: { businessId } }) || 0
  ]);

  const unassignedQRCodes = totalQRCodes - assignedQRCodes;
  const unprintedQRCodes = totalQRCodes - printedQRCodes;

  res.status(200).json({
    success: true,
    message: 'QR code statistics retrieved successfully',
    data: {
      totalQRCodes,
      assignedQRCodes,
      unassignedQRCodes,
      printedQRCodes,
      unprintedQRCodes,
      activeQRCodes,
      totalScans,
      avgScansPerCode: totalQRCodes > 0 ? (totalScans / totalQRCodes).toFixed(2) : 0
    }
  });
});

const deleteQRCode = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const qrCode = await QRCode.findOne({
    where: {
      id,
      businessId: req.user.id
    }
  });

  if (!qrCode) {
    throw new AppError(RESPONSE_MESSAGES.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  if (qrCode.userId) {
    throw new AppError('Cannot delete assigned QR code. Unassign first.', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  await qrCode.destroy();

  res.status(200).json({
    success: true,
    message: RESPONSE_MESSAGES.DELETED,
    data: null
  });
});

const generatePrintablePDF = asyncHandler(async (req, res) => {
  const {
    qrCodeIds = [],
    codesPerRow = 4,
    includeCodeText = true,
    includeBusinessHeader = true
  } = req.body;

  if (!Array.isArray(qrCodeIds) || qrCodeIds.length === 0) {
    throw new AppError('QR code IDs array is required', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  if (qrCodeIds.length > 50) {
    throw new AppError('Maximum 50 QR codes per PDF', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  // Fetch QR codes from database
  const qrCodes = await QRCode.findAll({
    where: {
      id: { [Op.in]: qrCodeIds },
      businessId: req.user.id
    }
  });

  if (qrCodes.length === 0) {
    throw new AppError('No valid QR codes found', 404, ERROR_CODES.NOT_FOUND);
  }

  // Get business name
  const business = await req.user.Business || req.user;
  const businessName = business.name || 'Business';

  // Generate PDF
  const pdfBuffer = await qrService.generatePrintablePDF(qrCodes, {
    codesPerRow,
    includeCodeText,
    includeBusinessHeader,
    businessName
  });

  // Upload PDF to DigitalOcean Spaces
  const filename = `qr-codes-${Date.now()}.pdf`;
  const pdfUrl = await uploadToSpaces(
    { buffer: pdfBuffer, mimetype: 'application/pdf' },
    `pdfs/${req.user.id}`,
    filename
  );

  // Mark QR codes as printed
  await QRCode.update(
    {
      isPrinted: true,
      printedAt: new Date()
    },
    {
      where: {
        id: { [Op.in]: qrCodeIds },
        businessId: req.user.id
      }
    }
  );

  res.status(200).json({
    success: true,
    message: 'Printable PDF generated successfully',
    data: {
      pdfUrl,
      qrCodeCount: qrCodes.length,
      filename
    }
  });
});

module.exports = {
  generateQRCodes,
  getQRCodes,
  assignQRCode,
  unassignQRCode,
  generatePrintablePDF,
  toggleQRCodeStatus,
  getQRCodeStats,
  deleteQRCode
};