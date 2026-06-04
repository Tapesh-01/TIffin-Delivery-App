const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// @desc    Upload an image buffer to Cloudinary
// @route   POST /api/upload
// @access  Private/Admin
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    // Set up upload stream
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'tiffin_app_uploads' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Stream Error:', error);
          return res.status(500).json({ success: false, message: 'Cloudinary upload failed: ' + error.message });
        }
        res.json({
          success: true,
          url: result.secure_url,
          public_id: result.public_id
        });
      }
    );

    // End upload stream with file buffer
    uploadStream.end(req.file.buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
