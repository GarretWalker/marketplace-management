import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

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

export interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: { total?: number };
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/products`;

  /**
   * Create product
   */
  createProduct(input: CreateProductInput): Observable<ApiResponse<Product>> {
    return this.http.post<ApiResponse<Product>>(this.baseUrl, input);
  }

  /**
   * Get products with filters
   */
  getProducts(filters?: ProductListFilters): Observable<ApiResponse<ProductWithImages[]>> {
    let params = new HttpParams();

    if (filters) {
      if (filters.merchantId) params = params.set('merchant_id', filters.merchantId);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.categoryId) params = params.set('category_id', filters.categoryId);
      if (filters.sortBy) params = params.set('sort_by', filters.sortBy);
      if (filters.sortOrder) params = params.set('sort_order', filters.sortOrder);
      if (filters.limit) params = params.set('limit', filters.limit.toString());
      if (filters.offset) params = params.set('offset', filters.offset.toString());
    }

    return this.http.get<ApiResponse<ProductWithImages[]>>(this.baseUrl, { params });
  }

  /**
   * Get single product
   */
  getProduct(id: string): Observable<ApiResponse<ProductWithImages>> {
    return this.http.get<ApiResponse<ProductWithImages>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Update product
   */
  updateProduct(id: string, input: UpdateProductInput): Observable<ApiResponse<Product>> {
    return this.http.put<ApiResponse<Product>>(`${this.baseUrl}/${id}`, input);
  }

  /**
   * Delete (archive) product
   */
  deleteProduct(id: string): Observable<ApiResponse<Product>> {
    return this.http.delete<ApiResponse<Product>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Update inventory
   */
  updateInventory(id: string, quantity: number): Observable<ApiResponse<Product>> {
    return this.http.put<ApiResponse<Product>>(`${this.baseUrl}/${id}/inventory`, { quantity });
  }

  /**
   * Reorder images
   */
  reorderImages(productId: string, imageIds: string[]): Observable<ApiResponse<{ success: boolean }>> {
    return this.http.put<ApiResponse<{ success: boolean }>>(
      `${this.baseUrl}/${productId}/images/reorder`,
      { imageIds }
    );
  }

  /**
   * Delete image
   */
  deleteImage(imageId: string, productId: string): Observable<ApiResponse<{ success: boolean }>> {
    const params = new HttpParams().set('product_id', productId);
    return this.http.delete<ApiResponse<{ success: boolean }>>(
      `${this.baseUrl}/images/${imageId}`,
      { params }
    );
  }
}
