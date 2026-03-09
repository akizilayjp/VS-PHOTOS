const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit per photo
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
    }
  }
});

// Validation middleware for photo upload
const photoValidation = [
  body('item_id')
    .isInt({ min: 1 })
    .withMessage('Item ID must be a positive integer')
];

// Upload single photo for an item
router.post('/upload', authenticateToken, requireAdmin, upload.single('photo'), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Clean up uploaded file if validation fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(400).json({
      error: 'Validation failed',
      errors: errors.array()
    });
  }

  const { item_id } = req.body;

  if (!req.file) {
    return res.status(400).json({
      error: 'No file uploaded',
      message: 'Please upload a photo file'
    });
  }

  try {
    // Check if item exists
    const itemResult = await query(
      'SELECT id, client_id FROM items WHERE id = $1',
      [item_id]
    );

    if (itemResult.rows.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      return res.status(404).json({
        error: 'Item not found',
        message: 'Item does not exist'
      });
    }

    const item = itemResult.rows[0];

    // Check current photo count for this item
    const photoCountResult = await query(
      'SELECT COUNT(*) as count FROM photos WHERE item_id = $1',
      [item_id]
    );

    const currentPhotoCount = parseInt(photoCountResult.rows[0].count);

    if (currentPhotoCount >= 10) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      return res.status(400).json({
        error: 'Photo limit reached',
        message: 'Maximum 10 photos allowed per item'
      });
    }

    // Process and optimize image
    const optimizedImagePath = path.join(__dirname, '../../uploads', 'optimized-' + req.file.filename);
    
    await sharp(req.file.path)
      .resize(1200, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(optimizedImagePath);

    // Get file stats
    const stats = fs.statSync(optimizedImagePath);

    // Insert photo record into database
    const photoResult = await query(
      `INSERT INTO photos (
        item_id, filename, original_filename, file_path, file_size, mime_type
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, filename, original_filename, file_path, file_size, mime_type, created_at`,
      [
        item_id,
        'optimized-' + req.file.filename,
        req.file.originalname,
        '/uploads/optimized-' + req.file.filename,
        stats.size,
        'image/jpeg'
      ]
    );

    // Clean up original uploaded file
    fs.unlinkSync(req.file.path);

    res.status(201).json({
      message: 'Photo uploaded successfully',
      photo: {
        ...photoResult.rows[0],
        item_id: item_id
      }
    });

  } catch (error) {
    console.error('Photo upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Upload failed',
      message: 'An error occurred while uploading the photo'
    });
  }
});

// Upload multiple photos for an item (batch upload)
router.post('/upload-batch', authenticateToken, requireAdmin, upload.array('photos', 10), async (req, res) => {
  const { item_id } = req.body;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: 'No files uploaded',
      message: 'Please upload photo files'
    });
  }

  try {
    // Check if item exists
    const itemResult = await query(
      'SELECT id, client_id FROM items WHERE id = $1',
      [item_id]
    );

    if (itemResult.rows.length === 0) {
      // Clean up uploaded files
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      
      return res.status(404).json({
        error: 'Item not found',
        message: 'Item does not exist'
      });
    }

    const item = itemResult.rows[0];

    // Check current photo count for this item
    const photoCountResult = await query(
      'SELECT COUNT(*) as count FROM photos WHERE item_id = $1',
      [item_id]
    );

    const currentPhotoCount = parseInt(photoCountResult.rows[0].count);

    if (currentPhotoCount + req.files.length > 10) {
      // Clean up uploaded files
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      
      return res.status(400).json({
        error: 'Photo limit exceeded',
        message: `Cannot upload ${req.files.length} photos. Only ${10 - currentPhotoCount} photos remaining for this item`
      });
    }

    const uploadedPhotos = [];
    const errors = [];

    // Process each uploaded file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      try {
        // Process and optimize image
        const optimizedImagePath = path.join(__dirname, '../../uploads', 'optimized-' + file.filename);
        
        await sharp(file.path)
          .resize(1200, 800, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 80 })
          .toFile(optimizedImagePath);

        // Get file stats
        const stats = fs.statSync(optimizedImagePath);

        // Insert photo record into database
        const photoResult = await query(
          `INSERT INTO photos (
            item_id, filename, original_filename, file_path, file_size, mime_type
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, filename, original_filename, file_path, file_size, mime_type, created_at`,
          [
            item_id,
            'optimized-' + file.filename,
            file.originalname,
            '/uploads/optimized-' + file.filename,
            stats.size,
            'image/jpeg'
          ]
        );

        uploadedPhotos.push({
          ...photoResult.rows[0],
          item_id: item_id
        });

        // Clean up original uploaded file
        fs.unlinkSync(file.path);

      } catch (error) {
        errors.push({
          file: file.originalname,
          error: error.message
        });

        // Clean up failed file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    res.status(201).json({
      message: `Batch upload completed. ${uploadedPhotos.length} photos uploaded successfully`,
      summary: {
        total: req.files.length,
        successful: uploadedPhotos.length,
        failed: errors.length
      },
      photos: uploadedPhotos,
      errors: errors
    });

  } catch (error) {
    console.error('Batch photo upload error:', error);
    
    // Clean up all uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      error: 'Batch upload failed',
      message: 'An error occurred while uploading photos'
    });
  }
});

// Get photos for an item
router.get('/item/:itemId', authenticateToken, async (req, res) => {
  const { itemId } = req.params;

  try {
    // Check if item exists and belongs to the authenticated user (or admin)
    const itemResult = await query(
      'SELECT id, client_id FROM items WHERE id = $1',
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Item not found',
        message: 'Item does not exist'
      });
    }

    const item = itemResult.rows[0];

    // Check permissions (admin can see all, client can only see their own)
    if (req.user.email !== process.env.ADMIN_EMAIL && item.client_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view photos for this item'
      });
    }

    const result = await query(
      'SELECT * FROM photos WHERE item_id = $1 ORDER BY created_at ASC',
      [itemId]
    );

    res.json({
      photos: result.rows
    });

  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({
      error: 'Failed to retrieve photos',
      message: 'An error occurred while fetching photos'
    });
  }
});

// Delete a photo
router.delete('/:photoId', authenticateToken, requireAdmin, async (req, res) => {
  const { photoId } = req.params;

  try {
    // Get photo details
    const photoResult = await query(
      'SELECT id, filename, file_path FROM photos WHERE id = $1',
      [photoId]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Photo not found',
        message: 'Photo does not exist'
      });
    }

    const photo = photoResult.rows[0];

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../', photo.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete record from database
    await query('DELETE FROM photos WHERE id = $1', [photoId]);

    res.json({
      message: 'Photo deleted successfully'
    });

  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({
      error: 'Failed to delete photo',
      message: 'An error occurred while deleting the photo'
    });
  }
});

module.exports = router;