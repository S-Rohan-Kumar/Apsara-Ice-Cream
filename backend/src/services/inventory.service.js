import Product from '../models/product.model.js';
import { APIError } from '../utils/api-error.js';
import { invalidate } from '../middleware/cache.middleware.js';
import { emitProductsUpdated } from '../socket/socket.js';

/**
 * Atomically reserve inventory during order creation.
 * If any item is out of stock or unavailable, rolls back all previous reservations in the batch.
 */
export const reserveInventory = async (items) => {
  if (!items || !items.length) return [];
  const reservedItems = [];

  try {
    for (const item of items) {
      const productId = item.product || item.productId;
      const isSingle = item.variant === 'single';
      const variantKey = isSingle ? 'regular' : item.variant;
      const qty = Number(item.quantity);

      if (!productId || qty <= 0) continue;

      let updatedProduct = null;

      if (isSingle) {
        updatedProduct = await Product.findOneAndUpdate(
          {
            _id: productId,
            isActive: true,
            isAvailable: true,
            $or: [
              { stock: { $gte: qty } },
              { stock: { $exists: false } }, // Backward compatibility for legacy docs
            ],
          },
          {
            $inc: { stock: -qty },
          },
          { new: true }
        );

        if (updatedProduct && typeof updatedProduct.stock === 'number' && updatedProduct.stock <= 0) {
          await Product.updateOne({ _id: productId }, { $set: { isAvailable: false } });
        }
      } else {
        updatedProduct = await Product.findOneAndUpdate(
          {
            _id: productId,
            isActive: true,
            isAvailable: true,
            [`variantAvailability.${variantKey}`]: true,
            $or: [
              { [`variantStock.${variantKey}`]: { $gte: qty } },
              { [`variantStock.${variantKey}`]: { $exists: false } },
            ],
          },
          {
            $inc: { [`variantStock.${variantKey}`]: -qty },
          },
          { new: true }
        );

        if (
          updatedProduct &&
          updatedProduct.variantStock &&
          typeof updatedProduct.variantStock[variantKey] === 'number' &&
          updatedProduct.variantStock[variantKey] <= 0
        ) {
          await Product.updateOne(
            { _id: productId },
            { $set: { [`variantAvailability.${variantKey}`]: false } }
          );
        }
      }

      if (!updatedProduct) {
        const itemLabel = item.productName || 'Selected flavor';
        throw new APIError(
          409,
          `Insufficient stock for "${itemLabel}" (${item.variant || 'regular'}). Please reduce quantity or choose another flavor.`
        );
      }

      reservedItems.push({
        product: productId,
        variant: item.variant,
        isSingle,
        quantity: qty,
      });
    }

    // Flush cache & notify clients of stock changes
    try {
      await invalidate('products', 'products_all');
      emitProductsUpdated({ action: 'stock_reserved', count: reservedItems.length });
    } catch (e) {
      // Non-critical cache error
    }

    return reservedItems;
  } catch (err) {
    // Rollback all reservations in this batch
    if (reservedItems.length > 0) {
      await releaseInventory(reservedItems).catch((rbErr) => {
        console.error('[Inventory Rollback Error]', rbErr);
      });
    }
    throw err;
  }
};

/**
 * Atomically release/restore inventory when an order is cancelled or checkout fails.
 */
export const releaseInventory = async (items) => {
  if (!items || !items.length) return;

  for (const item of items) {
    const productId = item.product || item.productId;
    const isSingle = item.isSingle || item.variant === 'single';
    const variantKey = isSingle ? 'regular' : item.variant;
    const qty = Number(item.quantity);

    if (!productId || qty <= 0) continue;

    try {
      if (isSingle) {
        await Product.findByIdAndUpdate(productId, {
          $inc: { stock: qty },
          $set: { isAvailable: true },
        });
      } else {
        await Product.findByIdAndUpdate(productId, {
          $inc: { [`variantStock.${variantKey}`]: qty },
          $set: {
            [`variantAvailability.${variantKey}`]: true,
            isAvailable: true,
          },
        });
      }
    } catch (restoreErr) {
      console.error(`[Inventory Restore Error] Product ${productId}:`, restoreErr.message);
    }
  }

  try {
    await invalidate('products', 'products_all');
    emitProductsUpdated({ action: 'stock_restored', count: items.length });
  } catch (e) {}
};

/**
 * Migration helper to ensure all products in DB have variantStock and stock fields initialized.
 */
export const syncMissingProductStock = async () => {
  try {
    const result = await Product.updateMany(
      { variantStock: { $exists: false } },
      {
        $set: {
          variantStock: { small: 50, regular: 50, large: 50, binge: 50, shareIt: 50 },
          stock: 50,
        },
      }
    );
    if (result.modifiedCount > 0) {
      console.log(`[Inventory Service] Initialized stock tracking for ${result.modifiedCount} legacy products.`);
    }
  } catch (err) {
    console.error('[Inventory Service] Stock sync warning:', err.message);
  }
};
