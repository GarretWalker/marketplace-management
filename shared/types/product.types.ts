import { ProductStatus } from '../enums/product-status.enum';
import { ProductSource } from '../enums/product-source.enum';

export interface Product {
  id: string;
  merchantId: string;
  categoryId?: string | null;
  
  // Basic Info
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  
  // Pricing
  price: number;
  compareAtPrice?: number | null;
  
  // Inventory
  quantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  
  // Source
  source: ProductSource;
  externalId?: string | null;
  externalVariantId?: string | null;
  lastSyncedAt?: string | null;
  
  // Status
  status: ProductStatus;
  
  // Metadata
  weightOz?: number | null;
  sku?: string | null;
  barcode?: string | null;
  tags?: string[];
  isFeatured: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  altText?: string | null;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
  trackInventory?: boolean;
  sku?: string;
  tags?: string[];
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  price?: number;
  compareAtPrice?: number;
  quantity?: number;
  lowStockThreshold?: number;
  trackInventory?: boolean;
  status?: ProductStatus;
  sku?: string;
  tags?: string[];
  isFeatured?: boolean;
}
