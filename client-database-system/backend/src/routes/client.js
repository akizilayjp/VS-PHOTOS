const express = require('express');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// Get client's items with photo counts
router.get('/items', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT i.*, COUNT(p.id) as photo_count
       FROM items i
       LEFT JOIN photos p ON i.id = p.item_id
       WHERE i.client_id = $1
       GROUP BY i.id
       ORDER BY i.created_at DESC`,
      [req.user.id]
    );

    res.json({
      items: result.rows
    });

  } catch (error) {
    console.error('Get client items error:', error);
    res.status(500).json({
      error: 'Failed to retrieve items',
      message: 'An error occurred while fetching your items'
    });
  }
});

// Get specific item details with photos
router.get('/items/:itemId', authenticateToken, async (req, res) => {
  const { itemId } = req.params;

  try {
    // Check if item exists and belongs to the client
    const itemResult = await query(
      `SELECT i.*, COUNT(p.id) as photo_count
       FROM items i
       LEFT JOIN photos p ON i.id = p.item_id
       WHERE i.id = $1 AND i.client_id = $2
       GROUP BY i.id`,
      [itemId, req.user.id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Item not found',
        message: 'Item does not exist or you do not have permission to view it'
      });
    }

    const item = itemResult.rows[0];

    // Get all photos for this item
    const photosResult = await query(
      'SELECT * FROM photos WHERE item_id = $1 ORDER BY created_at ASC',
      [itemId]
    );

    res.json({
      item: {
        ...item,
        photos: photosResult.rows
      }
    });

  } catch (error) {
    console.error('Get item details error:', error);
    res.status(500).json({
      error: 'Failed to retrieve item',
      message: 'An error occurred while fetching item details'
    });
  }
});

// Download all photos for a specific item as ZIP
router.get('/items/:itemId/download', authenticateToken, async (req, res) => {
  const { itemId } = req.params;

  try {
    // Check if item exists and belongs to the client
    const itemResult = await query(
      'SELECT id, sku, title FROM items WHERE id = $1 AND client_id = $2',
      [itemId, req.user.id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Item not found',
        message: 'Item does not exist or you do not have permission to download photos'
      });
    }

    const item = itemResult.rows[0];

    // Get all photos for this item
    const photosResult = await query(
      'SELECT * FROM photos WHERE item_id = $1 ORDER BY created_at ASC',
      [itemId]
    );

    if (photosResult.rows.length === 0) {
      return res.status(404).json({
        error: 'No photos found',
        message: 'No photos available for download'
      });
    }

    // Set headers for ZIP download
    const zipFilename = `item-${item.sku}-photos.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    archive.pipe(res);

    // Add photos to ZIP
    for (const photo of photosResult.rows) {
      const photoPath = path.join(__dirname, '../../', photo.file_path);
      
      if (fs.existsSync(photoPath)) {
        archive.file(photoPath, {
          name: `${item.sku}-photo-${photo.id}${path.extname(photo.filename)}`
        });
      }
    }

    // Finalize the archive
    await archive.finalize();

  } catch (error) {
    console.error('Download item photos error:', error);
    res.status(500).json({
      error: 'Download failed',
      message: 'An error occurred while preparing the download'
    });
  }
});

// Download photos for multiple selected items as ZIP
router.post('/download-selected', authenticateToken, async (req, res) => {
  const { itemIds } = req.body;

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Please provide an array of item IDs'
    });
  }

  try {
    // Check if all items exist and belong to the client
    const itemsResult = await query(
      `SELECT id, sku, title FROM items 
       WHERE id = ANY($1) AND client_id = $2`,
      [itemIds, req.user.id]
    );

    if (itemsResult.rows.length !== itemIds.length) {
      return res.status(400).json({
        error: 'Invalid item selection',
        message: 'Some items do not exist or you do not have permission to download them'
      });
    }

    // Get all photos for selected items
    const photosResult = await query(
      `SELECT p.*, i.sku 
       FROM photos p 
       JOIN items i ON p.item_id = i.id 
       WHERE p.item_id = ANY($1) AND i.client_id = $2
       ORDER BY i.sku, p.created_at`,
      [itemIds, req.user.id]
    );

    if (photosResult.rows.length === 0) {
      return res.status(404).json({
        error: 'No photos found',
        message: 'No photos available for the selected items'
      });
    }

    // Set headers for ZIP download
    const zipFilename = `selected-items-photos-${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    archive.pipe(res);

    // Group photos by item and add to ZIP
    const photosByItem = {};
    photosResult.rows.forEach(photo => {
      if (!photosByItem[photo.sku]) {
        photosByItem[photo.sku] = [];
      }
      photosByItem[photo.sku].push(photo);
    });

    // Add photos to ZIP organized by item folders
    Object.keys(photosByItem).forEach(sku => {
      const photos = photosByItem[sku];
      photos.forEach((photo, index) => {
        const photoPath = path.join(__dirname, '../../', photo.file_path);
        
        if (fs.existsSync(photoPath)) {
          archive.file(photoPath, {
            name: `${sku}/photo-${index + 1}${path.extname(photo.filename)}`
          });
        }
      });
    });

    // Finalize the archive
    await archive.finalize();

  } catch (error) {
    console.error('Download selected photos error:', error);
    res.status(500).json({
      error: 'Download failed',
      message: 'An error occurred while preparing the download'
    });
  }
});

// Get client profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Get client details and item/photo statistics
    const clientResult = await query(
      'SELECT id, name, email, created_at FROM clients WHERE id = $1',
      [req.user.id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Client not found',
        message: 'Client profile not found'
      });
    }

    const client = clientResult.rows[0];

    // Get item count
    const itemCountResult = await query(
      'SELECT COUNT(*) as count FROM items WHERE client_id = $1',
      [req.user.id]
    );

    // Get total photo count
    const photoCountResult = await query(
      `SELECT COUNT(*) as count 
       FROM photos p 
       JOIN items i ON p.item_id = i.id 
       WHERE i.client_id = $1`,
      [req.user.id]
    );

    res.json({
      client: {
        ...client,
        statistics: {
          total_items: parseInt(itemCountResult.rows[0].count),
          total_photos: parseInt(photoCountResult.rows[0].count)
        }
      }
    });

  } catch (error) {
    console.error('Get client profile error:', error);
    res.status(500).json({
      error: 'Failed to retrieve profile',
      message: 'An error occurred while fetching your profile'
    });
  }
});

// Search items by SKU, title, or other fields
router.get('/search', authenticateToken, async (req, res) => {
  const { q, field } = req.query;

  if (!q) {
    return res.status(400).json({
      error: 'Search query required',
      message: 'Please provide a search query'
    });
  }

  try {
    let queryText = '';
    let queryParams = [];

    // Build search query based on field parameter
    if (field === 'sku') {
      queryText = `
        SELECT i.*, COUNT(p.id) as photo_count
        FROM items i
        LEFT JOIN photos p ON i.id = p.item_id
        WHERE i.client_id = $1 AND i.sku ILIKE $2
        GROUP BY i.id
        ORDER BY i.created_at DESC
      `;
      queryParams = [req.user.id, `%${q}%`];
    } else if (field === 'title') {
      queryText = `
        SELECT i.*, COUNT(p.id) as photo_count
        FROM items i
        LEFT JOIN photos p ON i.id = p.item_id
        WHERE i.client_id = $1 AND i.title ILIKE $2
        GROUP BY i.id
        ORDER BY i.created_at DESC
      `;
      queryParams = [req.user.id, `%${q}%`];
    } else if (field === 'barcode') {
      queryText = `
        SELECT i.*, COUNT(p.id) as photo_count
        FROM items i
        LEFT JOIN photos p ON i.id = p.item_id
        WHERE i.client_id = $1 AND i.barcode ILIKE $2
        GROUP BY i.id
        ORDER BY i.created_at DESC
      `;
      queryParams = [req.user.id, `%${q}%`];
    } else {
      // Search across multiple fields
      queryText = `
        SELECT i.*, COUNT(p.id) as photo_count
        FROM items i
        LEFT JOIN photos p ON i.id = p.item_id
        WHERE i.client_id = $1 
        AND (i.sku ILIKE $2 OR i.title ILIKE $2 OR i.barcode ILIKE $2 OR i.asin ILIKE $2)
        GROUP BY i.id
        ORDER BY i.created_at DESC
      `;
      queryParams = [req.user.id, `%${q}%`];
    }

    const result = await query(queryText, queryParams);

    res.json({
      items: result.rows,
      query: q,
      field: field || 'all'
    });

  } catch (error) {
    console.error('Search items error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: 'An error occurred while searching for items'
    });
  }
});

module.exports = router;