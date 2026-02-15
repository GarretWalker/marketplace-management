export interface Product {
  id: string;
  merchantId: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
  lowStockThreshold: number;
  sku?: string;
  weight?: number;
  tags?: string[];
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  storageUrl: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface ProductWithImages extends Product {
  images: ProductImage[];
  categoryName?: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
  lowStockThreshold?: number;
  sku?: string;
  weight?: number;
  tags?: string[];
  status: 'draft' | 'published';
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
  sku?: string;
  weight?: number;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

export interface ProductListFilters {
  merchantId?: string;
  status?: string;
  categoryId?: string;
  sortBy?: 'name' | 'price' | 'createdAt' | 'quantity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface UploadImageInput {
  file: Buffer;
  filename: string;
  contentType: string;
}

export interface ReorderImagesInput {
  imageIds: string[];
}

export interface UpdateInventoryInput {
  quantity: number;
}
