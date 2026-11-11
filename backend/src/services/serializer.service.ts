import { UserContext } from '../types/index.js';

export interface ProductRow {
  id: number;
  reference: string;
  name: string;
  slug: string;
  brand: string | null;
  description: string | null;
  specs: any;
  unit: string;
  box_size: number;
  category_id: number | null;
  category_name?: string | null;
  purchase_price: number;
  sale_price: number;
  facture_price: number | null;
  tva: number;
  min_order_qty: number;
  min_stock_alert: number;
  published: boolean;
  active: boolean;
  physical_quantity: number;
  reserved_quantity: number;
  images?: Array<{
    id: number;
    url: string;
    thumb_url?: string | null;
    alt?: string | null;
    is_primary: boolean;
    sort_order: number;
  }>;
  primary_image?: string | null;
}

/**
 * Server-side Product Serializer & Price Masking Engine
 * Enforces strict information boundaries across roles according to 04-api-contract.md
 * Storefront calls (isStorefront = true) NEVER expose purchase_price or margin to ANY role.
 */
export function serializeProduct(product: ProductRow, user?: UserContext | null, isStorefront: boolean = false) {
  const physicalQty = Number(product.physical_quantity || 0);
  const reservedQty = Number(product.reserved_quantity || 0);
  const availableQty = Math.max(0, physicalQty - reservedQty);

  // Base public fields available to everyone (including unauthenticated visitors)
  const base = {
    id: product.id,
    reference: product.reference,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    description: product.description,
    specs: product.specs,
    unit: product.unit,
    box_size: product.box_size,
    category_id: product.category_id,
    category_name: product.category_name,
    images: product.images || [],
    primary_image: product.primary_image || (product.images?.[0]?.url ?? null),
    // Stock numbers are NEVER exposed to visitors or clients
    availability: availableQty > 0 ? ('IN_STOCK' as const) : ('OUT_OF_STOCK' as const),
  };

  // 1. Visitors or Clients who are NOT ACTIVE: NEVER return prices or stock numbers
  if (!user || (user.role === 'CLIENT' && user.clientStatus !== 'ACTIVE')) {
    return base;
  }

  // 2. ACTIVE Clients: Expose sale price and VAT, but NEVER purchase price or exact stock
  if (user.role === 'CLIENT' && user.clientStatus === 'ACTIVE') {
    const salePrice = Number(product.sale_price);
    const tva = Number(product.tva);
    const priceTtc = Math.round(salePrice * (1 + tva / 100) * 100) / 100;

    return {
      ...base,
      sale_price: salePrice,
      tva,
      price_ttc: priceTtc,
      min_order_qty: product.min_order_qty,
    };
  }

  // 3. ACCOUNTANT: Sees sale prices and EXACT physical stock, but NEVER purchase costs
  if (user.role === 'ACCOUNTANT') {
    const salePrice = Number(product.sale_price);
    const tva = Number(product.tva);
    const priceTtc = Math.round(salePrice * (1 + tva / 100) * 100) / 100;

    if (isStorefront) {
      return {
        ...base,
        sale_price: salePrice,
        tva,
        price_ttc: priceTtc,
        min_order_qty: product.min_order_qty,
      };
    }

    return {
      ...base,
      sale_price: salePrice,
      facture_price: product.facture_price !== null && product.facture_price !== undefined ? Number(product.facture_price) : null,
      tva,
      physical_quantity: physicalQty,
      reserved_quantity: reservedQty,
      available_quantity: availableQty,
      min_stock_alert: product.min_stock_alert,
      published: product.published,
      active: product.active,
    };
  }

  // 4. ADMIN: Full visibility in back-office, strictly protected on storefront
  if (user.role === 'ADMIN') {
    const salePrice = Number(product.sale_price);
    const tva = Number(product.tva);
    const priceTtc = Math.round(salePrice * (1 + tva / 100) * 100) / 100;

    if (isStorefront) {
      // Per UI Contract & security rules: Never expose purchase price or margin on storefront
      return {
        ...base,
        sale_price: salePrice,
        tva,
        price_ttc: priceTtc,
        min_order_qty: product.min_order_qty,
      };
    }

    const purchasePrice = Number(product.purchase_price);
    const marginAmount = Math.round((salePrice - purchasePrice) * 100) / 100;
    const marginPercent = purchasePrice > 0
      ? Math.round(((salePrice - purchasePrice) / purchasePrice) * 10000) / 100
      : 0;

    return {
      ...base,
      purchase_price: purchasePrice,
      sale_price: salePrice,
      facture_price: product.facture_price !== null && product.facture_price !== undefined ? Number(product.facture_price) : null,
      tva,
      margin_amount: marginAmount,
      margin_percent: marginPercent,
      physical_quantity: physicalQty,
      reserved_quantity: reservedQty,
      available_quantity: availableQty,
      min_stock_alert: product.min_stock_alert,
      published: product.published,
      active: product.active,
    };
  }

  return base;
}

