const multer = require("multer");
const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Max 10MB.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: "Unexpected file field. Use 'stnFile' as the key." });
    }
    return res.status(400).json({ message: err.message });
  }
  
  if (err.message.includes('Only PDF files are allowed')) {
    return res.status(400).json({ message: err.message });
  }

  console.error('Multer Error:', err);
  res.status(500).json({ message: 'File upload error' });
};

module.exports = errorHandler;