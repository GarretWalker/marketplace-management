import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MerchantService } from '../services/merchant.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Merchant } from '../../../../../../shared/types/merchant.types';

@Component({
  selector: 'app-merchant-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 py-6">
          <h1 class="text-3xl font-bold text-gray-900">Merchant Dashboard</h1>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex justify-center py-12">
          <div class="text-gray-600">Loading...</div>
        </div>

        <!-- Claim Pending Banner -->
        <div *ngIf="!isLoading && !merchant" class="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-semibold text-yellow-800">Business Claim Pending</h3>
              <p class="text-yellow-700 mt-1">
                Your claim request is being reviewed by your chamber admin. You'll be notified once it's approved.
              </p>
            </div>
          </div>
        </div>

        <!-- Stripe Not Connected Banner -->
        <div *ngIf="!isLoading && merchant && !merchant.stripeAccountId" class="mb-6 bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <h3 class="text-lg font-semibold text-blue-800">Connect Stripe to Accept Payments</h3>
              <p class="text-blue-700 mt-1 mb-3">
                You need to connect your Stripe account before you can start selling products.
              </p>
              <button 
                [routerLink]="['/merchant/settings']"
                class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
                Connect Stripe
              </button>
            </div>
          </div>
        </div>

        <!-- Main Content (when merchant is approved) -->
        <div *ngIf="!isLoading && merchant" class="space-y-6">
          <!-- Stats Grid -->
          <div class="grid md:grid-cols-4 gap-6">
            <div class="bg-white p-6 rounded-lg shadow">
              <div class="text-sm text-gray-600 mb-1">Total Products</div>
              <div class="text-3xl font-bold text-gray-900">0</div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow">
              <div class="text-sm text-gray-600 mb-1">Active Orders</div>
              <div class="text-3xl font-bold text-gray-900">0</div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow">
              <div class="text-sm text-gray-600 mb-1">Total Sales</div>
              <div class="text-3xl font-bold text-gray-900">$0.00</div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow">
              <div class="text-sm text-gray-600 mb-1">Status</div>
              <div class="text-lg font-semibold" [ngClass]="{
                'text-green-600': merchant.status === 'active',
                'text-yellow-600': merchant.status === 'pending',
                'text-red-600': merchant.status === 'suspended'
              }">
                {{ merchant.status | titlecase }}
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div class="grid md:grid-cols-3 gap-4">
              <button class="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                      [routerLink]="['/merchant/products/new']">
                <div class="text-2xl mb-2">📦</div>
                <div class="font-semibold">Add Product</div>
                <div class="text-sm text-gray-600">List a new item for sale</div>
              </button>
              <button class="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                      [routerLink]="['/merchant/orders']">
                <div class="text-2xl mb-2">📋</div>
                <div class="font-semibold">View Orders</div>
                <div class="text-sm text-gray-600">Manage your orders</div>
              </button>
              <button class="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                      [routerLink]="['/merchant/settings']">
                <div class="text-2xl mb-2">⚙️</div>
                <div class="font-semibold">Settings</div>
                <div class="text-sm text-gray-600">Configure your store</div>
              </button>
            </div>
          </div>

          <!-- Business Info -->
          <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-bold text-gray-900 mb-4">Business Information</h2>
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <div class="text-sm text-gray-600">Business Name</div>
                <div class="font-semibold">{{ merchant.businessName }}</div>
              </div>
              <div *ngIf="merchant.addressLine1">
                <div class="text-sm text-gray-600">Address</div>
                <div class="font-semibold">{{ merchant.addressLine1 }}</div>
                <div class="text-sm text-gray-700">{{ merchant.city }}, {{ merchant.state }} {{ merchant.zip }}</div>
              </div>
              <div *ngIf="merchant.phone">
                <div class="text-sm text-gray-600">Phone</div>
                <div class="font-semibold">{{ merchant.phone }}</div>
              </div>
              <div *ngIf="merchant.websiteUrl">
                <div class="text-sm text-gray-600">Website</div>
                <a [href]="merchant.websiteUrl" target="_blank" class="font-semibold text-blue-600 hover:text-blue-700">
                  {{ merchant.websiteUrl }}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MerchantDashboardComponent implements OnInit {
  private merchantService = inject(MerchantService);
  private authService = inject(AuthService);

  merchant: Merchant | null = null;
  isLoading = true;

  async ngOnInit() {
    await this.loadMerchant();
  }

  async loadMerchant() {
    this.isLoading = true;
    this.merchantService.getMe().subscribe({
      next: (response: any) => {
        this.merchant = response.data;
        this.isLoading = false;
      },
      error: (error: any) => {
        // If 404, merchant doesn't exist yet (claim not approved)
        if (error.status === 404) {
          this.merchant = null;
        }
        this.isLoading = false;
      }
    });
  }
}
