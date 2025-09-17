const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const { uploadToSpaces } = require('../config/digitalocean');

class QRService {
  generateUniqueCode(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < length; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return code;
  }

  async generateQRCode(data, options = {}) {
    const defaultOptions = {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    const qrOptions = { ...defaultOptions, ...options };

    try {
      // Generate QR code as buffer
      const buffer = await QRCode.toBuffer(
        JSON.stringify(data),
        qrOptions
      );
      
      return buffer;
    } catch (error) {
      console.error('QR code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  async generateBulkQRCodes(businessId, quantity, options = {}) {
    const qrCodes = [];
    
    for (let i = 0; i < quantity; i++) {
      const code = this.generateUniqueCode();
      const qrData = {
        businessId,
        code,
        type: 'customer-tag',
        generated: new Date().toISOString()
      };
      
      const qrBuffer = await this.generateQRCode(qrData, options);
      
      // Upload QR code to DigitalOcean Spaces
      const filename = `${code}_${uuidv4()}.png`;
      const imageUrl = await uploadToSpaces(
        { buffer: qrBuffer, mimetype: 'image/png' },
        `qrcodes/${businessId}`,
        filename
      );
      
      qrCodes.push({
        code,
        qrData,
        imageUrl
      });
    }
    
    return qrCodes;
  }

  async generatePrintablePDF(qrCodes, options = {}) {
    const {
      codesPerRow = 4,
      codesPerPage = 32,
      qrSize = 72, // points (1 inch = 72 points)
      includeCodeText = true,
      includeBusinessHeader = true,
      businessName = ''
    } = options;

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    // Calculate layout
    const pageWidth = doc.page.width - 100; // Accounting for margins
    const pageHeight = doc.page.height - 100;
    const cellWidth = pageWidth / codesPerRow;
    const cellHeight = qrSize + (includeCodeText ? 20 : 0);
    const rowsPerPage = Math.floor(pageHeight / cellHeight);

    // Add business header if requested
    if (includeBusinessHeader && businessName) {
      doc.fontSize(20)
         .text(businessName, { align: 'center' })
         .fontSize(12)
         .text('QR Code Tags', { align: 'center' })
         .moveDown(2);
    }

    let currentCode = 0;
    let currentRow = 0;
    let currentCol = 0;

    for (const qr of qrCodes) {
      // Calculate position
      const x = 50 + (currentCol * cellWidth);
      const y = 100 + (currentRow * cellHeight);

      // Add QR code image
      const qrBuffer = await this.generateQRCode(qr.qrData, { width: qrSize });
      doc.image(qrBuffer, x, y, { width: qrSize, height: qrSize });

      // Add code text if requested
      if (includeCodeText) {
        doc.fontSize(8)
           .text(qr.code, x, y + qrSize + 5, {
             width: qrSize,
             align: 'center'
           });
      }

      // Move to next position
      currentCol++;
      if (currentCol >= codesPerRow) {
        currentCol = 0;
        currentRow++;

        if (currentRow >= rowsPerPage) {
          // Add new page if needed
          if (currentCode < qrCodes.length - 1) {
            doc.addPage();
            currentRow = 0;

            // Add header on new page
            if (includeBusinessHeader && businessName) {
              doc.fontSize(12)
                 .text(`${businessName} - QR Code Tags (Page ${doc.page.count})`, { align: 'center' })
                 .moveDown(2);
            }
          }
        }
      }

      currentCode++;
    }

    // Finalize PDF
    doc.end();

    // Convert to buffer
    const pdfBuffer = Buffer.concat(chunks);

    return pdfBuffer;
  }

  parseQRCodeData(qrData) {
    try {
      const data = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
      
      return {
        isValid: data.businessId && data.code,
        businessId: data.businessId,
        code: data.code,
        type: data.type || 'unknown'
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid QR code format'
      };
    }
  }
}

module.exports = new QRService();