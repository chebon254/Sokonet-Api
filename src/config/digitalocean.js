const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK for DigitalOcean Spaces
const spacesEndpoint = new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT);
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
  region: process.env.DO_SPACES_REGION
});

const uploadToSpaces = async (file, folder, filename) => {
  const params = {
    Bucket: process.env.DO_SPACES_BUCKET,
    Key: `${folder}/${filename}`,
    Body: file.buffer,
    ACL: 'public-read',
    ContentType: file.mimetype
  };

  try {
    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.error('Upload to Spaces failed:', error);
    throw new Error('File upload failed');
  }
};

const deleteFromSpaces = async (keyOrUrl) => {
  try {
    let key = keyOrUrl;

    // If it's a URL, extract the key
    if (keyOrUrl.startsWith('http')) {
      const url = new URL(keyOrUrl);
      key = url.pathname.substring(1); // Remove leading slash
    }

    const params = {
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('Delete from Spaces failed:', error);
    return false;
  }
};

const generateSignedUrl = async (key, expirySeconds = 3600) => {
  const params = {
    Bucket: process.env.DO_SPACES_BUCKET,
    Key: key,
    Expires: expirySeconds
  };

  try {
    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    console.error('Generate signed URL failed:', error);
    throw new Error('Failed to generate signed URL');
  }
};

module.exports = {
  s3,
  uploadToSpaces,
  deleteFromSpaces,
  generateSignedUrl
};