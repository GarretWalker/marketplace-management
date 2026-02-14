import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-merchant-onboarding',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div class="max-w-4xl w-full bg-white rounded-lg shadow-xl p-8">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">Join Shop Local</h1>
          <p class="text-xl text-gray-600">Connect with your community and grow your business</p>
        </div>

        <div class="grid md:grid-cols-3 gap-6 mb-8">
          <div class="text-center p-6 bg-blue-50 rounded-lg">
            <div class="text-4xl mb-4">🏪</div>
            <h3 class="font-semibold text-lg mb-2">Claim Your Business</h3>
            <p class="text-gray-600 text-sm">Link your Chamber membership to start selling</p>
          </div>
          <div class="text-center p-6 bg-blue-50 rounded-lg">
            <div class="text-4xl mb-4">💳</div>
            <h3 class="font-semibold text-lg mb-2">Get Paid</h3>
            <p class="text-gray-600 text-sm">Connect with Stripe for secure payments</p>
          </div>
          <div class="text-center p-6 bg-blue-50 rounded-lg">
            <div class="text-4xl mb-4">📦</div>
            <h3 class="font-semibold text-lg mb-2">Sell Products</h3>
            <p class="text-gray-600 text-sm">List products and manage orders easily</p>
          </div>
        </div>

        <div class="flex justify-center gap-4">
          <button 
            [routerLink]="['/merchant/register']"
            class="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
            Get Started
          </button>
          <button 
            [routerLink]="['/login']"
            class="px-8 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition">
            Already Have an Account
          </button>
        </div>
      </div>
    </div>
  `
})
export class MerchantOnboardingComponent {}
