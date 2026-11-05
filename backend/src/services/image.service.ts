import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import multer from 'multer';
import { config } from '../config/index.js';
import { query, withTransaction } from '../db/index.js';

// Setup directories
const PRODUCTS_DIR = path.resolve(config.uploadDir, 'products');
const THUMBS_DIR = path.resolve(PRODUCTS_DIR, 'thumbs');

fs.mkdirSync(THUMBS_DIR, { recursive: true });

// Multer memory storage configuration
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, AVIF`));
    }
  },
});

export async function processAndSaveProductImage(
  productId: number,
  fileBuffer: Buffer,
  alt?: string
) {
  // Check if product exists
  const prodCheck = await query('SELECT id FROM products WHERE id = $1', [productId]);
  if (prodCheck.rows.length === 0) {
    throw new Error('Product not found');
  }

  const randSuffix = crypto.randomBytes(6).toString('hex');
  const baseName = `prod_${productId}_${Date.now()}_${randSuffix}`;
  const fullFileName = `${baseName}.webp`;
  const thumbFileName = `${baseName}_thumb.webp`;

  const fullFilePath = path.join(PRODUCTS_DIR, fullFileName);
  const thumbFilePath = path.join(THUMBS_DIR, thumbFileName);

  // 1. Process full resolution image (max 1200px width, WebP quality 85)
  await sharp(fileBuffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(fullFilePath);

  // 2. Process thumbnail (300x300, WebP quality 80)
  await sharp(fileBuffer)
    .resize(300, 300, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(thumbFilePath);

  const fullUrl = `/uploads/products/${fullFileName}`;
  const thumbUrl = `/uploads/products/thumbs/${thumbFileName}`;

  // Check if this is the first image for the product
  const countRes = await query(
    'SELECT COUNT(id) as count FROM product_images WHERE product_id = $1',
    [productId]
  );
  const isFirstImage = parseInt(countRes.rows[0]?.count || '0', 10) === 0;

  // Insert into database
  const insertRes = await query(
    `INSERT INTO product_images (product_id, url, thumb_url, alt, is_primary, sort_order)
     VALUES ($1, $2, $3, $4, $5, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM product_images WHERE product_id = $1))
     RETURNING id, product_id, url, thumb_url, alt, is_primary, sort_order`,
    [productId, fullUrl, thumbUrl, alt || null, isFirstImage]
  );

  return insertRes.rows[0];
}

export async function deleteProductImage(imageId: number) {
  const imgRes = await query('SELECT id, product_id, url, thumb_url, is_primary FROM product_images WHERE id = $1', [imageId]);
  if (imgRes.rows.length === 0) {
    throw new Error('Image not found');
  }

  const img = imgRes.rows[0];

  // Remove files from disk if present
  try {
    const fullDiskPath = path.resolve(config.uploadDir, img.url.replace(/^\/?uploads\//, ''));
    if (fs.existsSync(fullDiskPath)) fs.unlinkSync(fullDiskPath);
  } catch (err) {
    console.warn('Could not delete full image file:', err);
  }

  try {
    if (img.thumb_url) {
      const thumbDiskPath = path.resolve(config.uploadDir, img.thumb_url.replace(/^\/?uploads\//, ''));
      if (fs.existsSync(thumbDiskPath)) fs.unlinkSync(thumbDiskPath);
    }
  } catch (err) {
    console.warn('Could not delete thumbnail file:', err);
  }

  // Delete row from DB
  await withTransaction(async (client) => {
    await client.query('DELETE FROM product_images WHERE id = $1', [imageId]);

    // If the deleted image was primary, designate the first remaining image as primary
    if (img.is_primary) {
      await client.query(
        `UPDATE product_images
         SET is_primary = true
         WHERE id = (
           SELECT id FROM product_images
           WHERE product_id = $1
           ORDER BY sort_order ASC
           LIMIT 1
         )`,
        [img.product_id]
      );
    }
  });

  return { deleted: true };
}

export async function setPrimaryProductImage(imageId: number) {
  const imgRes = await query('SELECT id, product_id FROM product_images WHERE id = $1', [imageId]);
  if (imgRes.rows.length === 0) {
    throw new Error('Image not found');
  }

  const productId = imgRes.rows[0].product_id;

  return withTransaction(async (client) => {
    // Clear previous primary
    await client.query('UPDATE product_images SET is_primary = false WHERE product_id = $1', [productId]);
    // Set new primary
    const res = await client.query(
      'UPDATE product_images SET is_primary = true WHERE id = $1 RETURNING id, product_id, is_primary',
      [imageId]
    );
    return res.rows[0];
  });
}

