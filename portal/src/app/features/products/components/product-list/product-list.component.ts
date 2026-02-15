import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService, ProductWithImages, ProductImage } from '../../services/product.service';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 class="text-3xl font-bold text-gray-900">Products</h1>
          <button
            [routerLink]="['/merchant/products/new']"
            class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
            Add Product
          </button>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex justify-center py-12">
          <div class="text-gray-600">Loading products...</div>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p class="text-red-700">{{ error }}</p>
        </div>

        <!-- Filters -->
        <div *ngIf="!isLoading && products.length > 0" class="bg-white p-4 rounded-lg shadow mb-4">
          <div class="flex gap-4 flex-wrap">
            <!-- Status Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                [(ngModel)]="filters.status"
                (change)="loadProducts()"
                class="border border-gray-300 rounded-md px-3 py-2">
                <option value="">All</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <!-- Sort By -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                [(ngModel)]="filters.sortBy"
                (change)="loadProducts()"
                class="border border-gray-300 rounded-md px-3 py-2">
                <option value="createdAt">Date Added</option>
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="quantity">Quantity</option>
              </select>
            </div>

            <!-- Sort Order -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <select
                [(ngModel)]="filters.sortOrder"
                (change)="loadProducts()"
                class="border border-gray-300 rounded-md px-3 py-2">
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading && products.length === 0" class="bg-white p-12 rounded-lg shadow text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 class="mt-2 text-lg font-medium text-gray-900">No products yet</h3>
          <p class="mt-1 text-sm text-gray-500">Get started by adding your first product.</p>
          <div class="mt-6">
            <button
              [routerLink]="['/merchant/products/new']"
              class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
              Add Product
            </button>
          </div>
        </div>

        <!-- Product List -->
        <div *ngIf="!isLoading && products.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let product of products" class="hover:bg-gray-50">
                  <td class="px-6 py-4">
                    <div class="flex items-center">
                      <div class="h-12 w-12 flex-shrink-0 bg-gray-200 rounded-md overflow-hidden">
                        <img
                          *ngIf="getPrimaryImage(product)"
                          [src]="getPrimaryImage(product)!.storageUrl"
                          [alt]="product.name"
                          class="h-full w-full object-cover">
                        <div *ngIf="!getPrimaryImage(product)" class="h-full w-full flex items-center justify-center text-gray-400">
                          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">{{ product.name }}</div>
                        <div *ngIf="product.categoryName" class="text-sm text-gray-500">{{ product.categoryName }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">\${{ product.price.toFixed(2) }}</div>
                    <div *ngIf="product.compareAtPrice" class="text-sm text-gray-500 line-through">
                      \${{ product.compareAtPrice.toFixed(2) }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">{{ product.quantity }}</div>
                    <div *ngIf="product.quantity <= product.lowStockThreshold" class="text-xs text-red-600">
                      Low stock
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span [ngClass]="{
                      'bg-green-100 text-green-800': product.status === 'published',
                      'bg-yellow-100 text-yellow-800': product.status === 'draft',
                      'bg-gray-100 text-gray-800': product.status === 'archived'
                    }" class="px-2 py-1 text-xs font-semibold rounded-full">
                      {{ product.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      [routerLink]="['/merchant/products', product.id, 'edit']"
                      class="text-blue-600 hover:text-blue-900 mr-3">
                      Edit
                    </button>
                    <button
                      *ngIf="product.status !== 'archived'"
                      (click)="archiveProduct(product.id)"
                      class="text-red-600 hover:text-red-900">
                      Archive
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination Info -->
        <div *ngIf="!isLoading && products.length > 0 && total" class="mt-4 text-sm text-gray-600 text-center">
          Showing {{ products.length }} of {{ total }} products
        </div>
      </div>
    </div>
  `
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductService);
  private authService = inject(AuthService);

  products: ProductWithImages[] = [];
  isLoading = false;
  error: string | null = null;
  total?: number;

  filters = {
    status: '',
    sortBy: 'createdAt' as 'name' | 'price' | 'createdAt' | 'quantity',
    sortOrder: 'desc' as 'asc' | 'desc'
  };

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.error = null;

    const profile = this.authService.currentProfile;
    if (!profile?.merchant_id) {
      this.error = 'Merchant account not found';
      this.isLoading = false;
      return;
    }

    this.productService.getProducts({
      merchantId: profile.merchant_id,
      status: this.filters.status || undefined,
      sortBy: this.filters.sortBy,
      sortOrder: this.filters.sortOrder,
    }).subscribe({
      next: (response) => {
        if (response.error) {
          this.error = response.error.message;
        } else {
          this.products = response.data || [];
          this.total = response.meta?.total;
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load products';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  getPrimaryImage(product: ProductWithImages): ProductImage | undefined {
    return product.images.find(img => img.isPrimary) || product.images[0];
  }

  archiveProduct(productId: string): void {
    if (!confirm('Are you sure you want to archive this product?')) {
      return;
    }

    this.productService.deleteProduct(productId).subscribe({
      next: (response) => {
        if (response.error) {
          alert('Failed to archive product: ' + response.error.message);
        } else {
          this.loadProducts();
        }
      },
      error: (err) => {
        alert('Failed to archive product');
        console.error(err);
      }
    });
  }
}
