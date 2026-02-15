import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ProductService } from '../../services/product.service';
import { environment } from '../../../../../environments/environment';

interface Category {
  id: string;
  name: string;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b">
        <div class="max-w-4xl mx-auto px-4 py-6">
          <h1 class="text-3xl font-bold text-gray-900">
            {{ isEditMode ? 'Edit Product' : 'Add Product' }}
          </h1>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 py-8">
        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex justify-center py-12">
          <div class="text-gray-600">Loading...</div>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p class="text-red-700">{{ error }}</p>
        </div>

        <!-- Form -->
        <form *ngIf="!isLoading" [formGroup]="productForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <!-- Main Information Card -->
          <div class="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Product Information</h2>

            <!-- Product Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Product Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                formControlName="name"
                placeholder="e.g., Handcrafted Oak Coffee Table"
                class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                [class.border-red-500]="productForm.get('name')?.invalid && productForm.get('name')?.touched">
              <p *ngIf="productForm.get('name')?.invalid && productForm.get('name')?.touched" class="text-red-500 text-sm mt-1">
                Product name is required
              </p>
            </div>

            <!-- Short Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Short Description
              </label>
              <input
                type="text"
                formControlName="shortDescription"
                placeholder="Brief tagline (optional)"
                class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                formControlName="description"
                rows="6"
                placeholder="Describe your product..."
                class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
            </div>

            <!-- Category -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                formControlName="categoryId"
                class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Select a category...</option>
                <option *ngFor="let category of categories" [value]="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>

            <!-- Price Row -->
            <div class="grid md:grid-cols-2 gap-4">
              <!-- Price -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Price <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-2 text-gray-500">\$</span>
                  <input
                    type="number"
                    formControlName="price"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    class="w-full pl-7 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    [class.border-red-500]="productForm.get('price')?.invalid && productForm.get('price')?.touched">
                </div>
                <p *ngIf="productForm.get('price')?.invalid && productForm.get('price')?.touched" class="text-red-500 text-sm mt-1">
                  Price is required
                </p>
              </div>

              <!-- Compare At Price -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Compare-at Price
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-2 text-gray-500">\$</span>
                  <input
                    type="number"
                    formControlName="compareAtPrice"
                    step="0.01"
                    min="0"
                    placeholder="0.00 (optional)"
                    class="w-full pl-7 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <p class="text-xs text-gray-500 mt-1">Original price before discount</p>
              </div>
            </div>

            <!-- Inventory Row -->
            <div class="grid md:grid-cols-2 gap-4">
              <!-- Quantity -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span class="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  formControlName="quantity"
                  min="0"
                  placeholder="0"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  [class.border-red-500]="productForm.get('quantity')?.invalid && productForm.get('quantity')?.touched">
                <p *ngIf="productForm.get('quantity')?.invalid && productForm.get('quantity')?.touched" class="text-red-500 text-sm mt-1">
                  Quantity is required
                </p>
              </div>

              <!-- Low Stock Threshold -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  formControlName="lowStockThreshold"
                  min="0"
                  placeholder="5"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <p class="text-xs text-gray-500 mt-1">Alert when stock falls below this number</p>
              </div>
            </div>

            <!-- Image Upload Placeholder -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Images
              </label>
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="mt-2 text-sm text-gray-500">
                  Image upload not available (VPS network limitation)
                </p>
              </div>
            </div>
          </div>

          <!-- Advanced Section -->
          <div class="bg-white rounded-lg shadow">
            <button
              type="button"
              (click)="showAdvanced = !showAdvanced"
              class="w-full px-6 py-4 flex justify-between items-center">
              <h2 class="text-lg font-semibold text-gray-900">Advanced Options</h2>
              <svg
                [class.rotate-180]="showAdvanced"
                class="h-5 w-5 text-gray-500 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div *ngIf="showAdvanced" class="px-6 pb-6 space-y-4">
              <!-- SKU -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  formControlName="sku"
                  placeholder="e.g., PROD-001"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <!-- Weight -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  formControlName="weight"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <!-- Tags -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  formControlName="tagsInput"
                  placeholder="handmade, wood, furniture (comma-separated)"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <p class="text-xs text-gray-500 mt-1">Separate tags with commas</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="bg-white rounded-lg shadow p-6 flex justify-between items-center">
            <button
              type="button"
              [routerLink]="['/merchant/products']"
              class="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
            <div class="flex gap-3">
              <button
                type="submit"
                [disabled]="isSubmitting"
                (click)="saveDraft()"
                class="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
                {{ isSubmitting ? 'Saving...' : 'Save as Draft' }}
              </button>
              <button
                type="submit"
                [disabled]="productForm.invalid || isSubmitting"
                (click)="publish()"
                class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {{ isSubmitting ? 'Publishing...' : 'Publish' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `
})
export class ProductFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private productService = inject(ProductService);

  productForm!: FormGroup;
  isEditMode = false;
  productId?: string;
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;
  showAdvanced = false;
  categories: Category[] = [];
  saveAsDraft = false;

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();

    // Check if we're in edit mode
    this.productId = this.route.snapshot.paramMap.get('id') || undefined;
    this.isEditMode = !!this.productId;

    if (this.isEditMode && this.productId) {
      this.loadProduct(this.productId);
    }
  }

  initForm(): void {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      shortDescription: [''],
      description: [''],
      categoryId: [''],
      price: ['', [Validators.required, Validators.min(0)]],
      compareAtPrice: [''],
      quantity: [0, [Validators.required, Validators.min(0)]],
      lowStockThreshold: [5, Validators.min(0)],
      sku: [''],
      weight: [''],
      tagsInput: ['']
    });
  }

  loadCategories(): void {
    this.http
      .get<{ data: Category[]; error: any }>(`${environment.apiUrl}/categories`)
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.categories = response.data;
          }
        },
        error: (err) => {
          console.error('Failed to load categories', err);
        }
      });
  }

  loadProduct(id: string): void {
    this.isLoading = true;
    this.productService.getProduct(id).subscribe({
      next: (response) => {
        if (response.error) {
          this.error = response.error.message;
        } else if (response.data) {
          const product = response.data;
          this.productForm.patchValue({
            name: product.name,
            shortDescription: product.shortDescription || '',
            description: product.description || '',
            categoryId: product.categoryId || '',
            price: product.price,
            compareAtPrice: product.compareAtPrice || '',
            quantity: product.quantity,
            lowStockThreshold: product.lowStockThreshold,
            sku: product.sku || '',
            weight: product.weight || '',
            tagsInput: product.tags ? product.tags.join(', ') : ''
          });
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load product';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  saveDraft(): void {
    this.saveAsDraft = true;
  }

  publish(): void {
    this.saveAsDraft = false;
  }

  onSubmit(): void {
    if (this.productForm.invalid && !this.saveAsDraft) {
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    const formValue = this.productForm.value;
    const tags = formValue.tagsInput
      ? formValue.tagsInput.split(',').map((t: string) => t.trim()).filter((t: string) => t)
      : [];

    const productData = {
      name: formValue.name,
      shortDescription: formValue.shortDescription || undefined,
      description: formValue.description || undefined,
      categoryId: formValue.categoryId || undefined,
      price: parseFloat(formValue.price),
      compareAtPrice: formValue.compareAtPrice ? parseFloat(formValue.compareAtPrice) : undefined,
      quantity: parseInt(formValue.quantity),
      lowStockThreshold: formValue.lowStockThreshold ? parseInt(formValue.lowStockThreshold) : 5,
      sku: formValue.sku || undefined,
      weight: formValue.weight ? parseFloat(formValue.weight) : undefined,
      tags: tags.length > 0 ? tags : undefined,
      status: this.saveAsDraft ? ('draft' as const) : ('published' as const)
    };

    const request = this.isEditMode && this.productId
      ? this.productService.updateProduct(this.productId, productData)
      : this.productService.createProduct(productData);

    request.subscribe({
      next: (response) => {
        if (response.error) {
          this.error = response.error.message;
          this.isSubmitting = false;
        } else {
          this.router.navigate(['/merchant/products']);
        }
      },
      error: (err) => {
        this.error = 'Failed to save product';
        this.isSubmitting = false;
        console.error(err);
      }
    });
  }
}
