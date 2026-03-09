const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// Configure multer for CSV file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Validation middleware for item creation
const itemValidation = [
  body('client_id')
    .isInt({ min: 1 })
    .withMessage('Client ID must be a positive integer'),
  body('sku')
    .trim()
    .notEmpty()
    .withMessage('SKU is required')
    .isLength({ max: 100 })
    .withMessage('SKU cannot exceed 100 characters'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 500 })
    .withMessage('Title cannot exceed 500 characters'),
  body('barcode')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Barcode cannot exceed 100 characters'),
  body('asin')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('ASIN cannot exceed 20 characters'),
  body('fnsku')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('FNSKU cannot exceed 50 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('hs_code')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('HS Code cannot exceed 20 characters')
];

// Import items from CSV file
router.post('/import-csv', authenticateToken, requireAdmin, upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No file uploaded',
      message: 'Please upload a CSV file'
    });
  }

  const results = [];
  const errors = [];
  let processedCount = 0;
  let successCount = 0;

  try {
    // Check if file exists
    if (!fs.existsSync(req.file.path)) {
      return res.status(400).json({
        error: 'File not found',
        message: 'Uploaded file could not be processed'
      });
    }

    // Read and parse CSV
    const fileStream = fs.createReadStream(req.file.path);
    
    fileStream
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        if (results.length === 0) {
          return res.status(400).json({
            error: 'Empty file',
            message: 'CSV file contains no data'
          });
        }

        // Validate CSV headers
        const requiredHeaders = ['SKU', 'Title'];
        const missingHeaders = requiredHeaders.filter(header => !results[0].hasOwnProperty(header));
        
        if (missingHeaders.length > 0) {
          return res.status(400).json({
            error: 'Invalid CSV format',
            message: `Missing required columns: ${missingHeaders.join(', ')}`
          });
        }

        // Process each row
        for (const row of results) {
          processedCount++;
          
          try {
            // Find or create client based on email (assuming email is in CSV or use default)
            let clientId = row.Client_ID;
            
            if (!clientId && row.Client_Email) {
              // Try to find client by email
              const clientResult = await query(
                'SELECT id FROM clients WHERE email = $1',
                [row.Client_Email]
              );
              
              if (clientResult.rows.length > 0) {
                clientId = clientResult.rows[0].id;
              } else {
                // Create new client if not found
                const newClient = await query(
                  'INSERT INTO clients (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
                  [row.Client_Name || row.Client_Email, row.Client_Email, 'default_password_hash']
                );
                clientId = newClient.rows[0].id;
              }
            }

            if (!clientId) {
              errors.push({
                row: processedCount,
                error: 'No client specified',
                message: 'Each item must be associated with a client'
              });
              continue;
            }

            // Check if client exists
            const clientCheck = await query(
              'SELECT id FROM clients WHERE id = $1',
              [clientId]
            );

            if (clientCheck.rows.length === 0) {
              errors.push({
                row: processedCount,
                error: 'Invalid client',
                message: `Client with ID ${clientId} does not exist`
              });
              continue;
            }

            // Insert item
            await query(
              `INSERT INTO items (
                client_id, sku, barcode, title, asin, fnsku, price, quantity, hs_code
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (client_id, sku) DO UPDATE SET
                barcode = EXCLUDED.barcode,
                title = EXCLUDED.title,
                asin = EXCLUDED.asin,
                fnsku = EXCLUDED.fnsku,
                price = EXCLUDED.price,
                quantity = EXCLUDED.quantity,
                hs_code = EXCLUDED.hs_code,
                updated_at = CURRENT_TIMESTAMP`,
              [
                clientId,
                row.SKU,
                row.Barcode || null,
                row.Title,
                row.ASIN || null,
                row.FNSKU || null,
                row.Price ? parseFloat(row.Price) : null,
                row.Quantity ? parseInt(row.Quantity) : null,
                row.HS_Code || null
              ]
            );

            successCount++;

          } catch (error) {
            errors.push({
              row: processedCount,
              error: 'Database error',
              message: error.message
            });
          }
        }

        res.json({
          message: 'CSV import completed',
          summary: {
            total: results.length,
            processed: processedCount,
            successful: successCount,
            failed: errors.length
          },
          errors: errors
        });

      })
      .on('error', (error) => {
        // Clean up uploaded file on error
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
          error: 'CSV processing failed',
          message: error.message
        });
      });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      error: 'Import failed',
      message: error.message
    });
  }
});

// Create new item manually
router.post('/items', authenticateToken, requireAdmin, itemValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      errors: errors.array()
    });
  }

  const { client_id, sku, barcode, title, asin, fnsku, price, quantity, hs_code } = req.body;

  try {
    // Check if client exists
    const clientResult = await query(
      'SELECT id FROM clients WHERE id = $1',
      [client_id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid client',
        message: 'Client not found'
      });
    }

    // Check if item already exists for this client
    const existingItem = await query(
      'SELECT id FROM items WHERE client_id = $1 AND sku = $2',
      [client_id, sku]
    );

    if (existingItem.rows.length > 0) {
      return res.status(400).json({
        error: 'Item already exists',
        message: 'An item with this SKU already exists for this client'
      });
    }

    // Create new item
    const result = await query(
      `INSERT INTO items (
        client_id, sku, barcode, title, asin, fnsku, price, quantity, hs_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, client_id, sku, barcode, title, asin, fnsku, price, quantity, hs_code, created_at`,
      [client_id, sku, barcode, title, asin, fnsku, price, quantity, hs_code]
    );

    res.status(201).json({
      message: 'Item created successfully',
      item: result.rows[0]
    });

  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({
      error: 'Failed to create item',
      message: 'An error occurred while creating the item'
    });
  }
});

// Get all clients
router.get('/clients', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, created_at FROM clients ORDER BY created_at DESC',
      []
    );

    res.json({
      clients: result.rows
    });

  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      error: 'Failed to retrieve clients',
      message: 'An error occurred while fetching clients'
    });
  }
});

// Get items for a specific client
router.get('/clients/:clientId/items', authenticateToken, requireAdmin, async (req, res) => {
  const { clientId } = req.params;

  try {
    // Verify client exists
    const clientResult = await query(
      'SELECT id FROM clients WHERE id = $1',
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Client not found',
        message: 'Client does not exist'
      });
    }

    const result = await query(
      `SELECT i.*, COUNT(p.id) as photo_count
       FROM items i
       LEFT JOIN photos p ON i.id = p.item_id
       WHERE i.client_id = $1
       GROUP BY i.id
       ORDER BY i.created_at DESC`,
      [clientId]
    );

    res.json({
      items: result.rows
    });

  } catch (error) {
    console.error('Get client items error:', error);
    res.status(500).json({
      error: 'Failed to retrieve items',
      message: 'An error occurred while fetching items'
    });
  }
});

module.exports = router;