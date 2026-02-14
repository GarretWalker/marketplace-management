import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClaimService } from '../services/claim.service';
import { ChamberService } from '../../../core/services/chamber.service';
import { CreateClaimInput } from '../../../../../../shared/types/claim.types';

interface Chamber {
  id: string;
  name: string;
  slug: string;
}

interface CMMember {
  id: string;
  business_name: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  city?: string;
  state?: string;
}

type WizardStep = 'chamber' | 'search' | 'details' | 'thank-you';

@Component({
  selector: 'app-claim-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-12">
      <div class="max-w-3xl mx-auto px-4">
        <!-- Progress Steps -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div *ngFor="let step of steps; let i = index" class="flex items-center" [class.flex-1]="i < steps.length - 1">
              <div class="flex items-center">
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold transition"
                     [class.bg-blue-600]="getCurrentStepIndex() >= i"
                     [class.text-white]="getCurrentStepIndex() >= i"
                     [class.bg-gray-300]="getCurrentStepIndex() < i"
                     [class.text-gray-600]="getCurrentStepIndex() < i">
                  {{ i + 1 }}
                </div>
                <span class="ml-2 font-medium text-sm" 
                      [class.text-blue-600]="getCurrentStepIndex() >= i"
                      [class.text-gray-500]="getCurrentStepIndex() < i">
                  {{ step.label }}
                </span>
              </div>
              <div *ngIf="i < steps.length - 1" class="flex-1 h-1 mx-4 transition"
                   [class.bg-blue-600]="getCurrentStepIndex() > i"
                   [class.bg-gray-300]="getCurrentStepIndex() <= i"></div>
            </div>
          </div>
        </div>

        <!-- Step 1: Select Chamber -->
        <div *ngIf="currentStep === 'chamber'" class="bg-white rounded-lg shadow-lg p-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Select Your Chamber</h2>
          <p class="text-gray-600 mb-6">Choose the chamber of commerce where your business is a member.</p>

          <div *ngIf="isLoadingChambers" class="text-center py-8 text-gray-600">
            Loading chambers...
          </div>

          <div *ngIf="!isLoadingChambers" class="space-y-3">
            <button *ngFor="let chamber of chambers"
                    (click)="selectChamber(chamber)"
                    class="w-full p-4 border-2 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition">
              <div class="font-semibold text-gray-900">{{ chamber.name }}</div>
            </button>
          </div>

          <div *ngIf="!isLoadingChambers && chambers.length === 0" class="text-center py-8">
            <p class="text-gray-600">No chambers available at this time.</p>
          </div>
        </div>

        <!-- Step 2: Search Business -->
        <div *ngIf="currentStep === 'search'" class="bg-white rounded-lg shadow-lg p-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Find Your Business</h2>
          <p class="text-gray-600 mb-6">Search for your business in the {{ selectedChamber?.name }} directory.</p>

          <input type="text"
                 [(ngModel)]="searchQuery"
                 (input)="onSearchInput()"
                 placeholder="Enter business name..."
                 class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4">

          <div *ngIf="isSearching" class="text-center py-8 text-gray-600">
            Searching...
          </div>

          <div *ngIf="!isSearching && searchResults.length > 0" class="space-y-2 max-h-96 overflow-y-auto">
            <button *ngFor="let member of searchResults"
                    (click)="selectBusiness(member)"
                    class="w-full p-4 border rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition">
              <div class="font-semibold text-gray-900">{{ member.business_name }}</div>
              <div *ngIf="member.address_line1" class="text-sm text-gray-600 mt-1">
                {{ member.address_line1 }}, {{ member.city }}, {{ member.state }}
              </div>
            </button>
          </div>

          <div *ngIf="!isSearching && searchQuery && searchResults.length === 0" class="text-center py-8 text-gray-600">
            No businesses found matching "{{ searchQuery }}".
          </div>

          <button (click)="currentStep = 'chamber'" class="mt-6 px-4 py-2 text-gray-600 hover:text-gray-900">
            ← Back
          </button>
        </div>

        <!-- Step 3: Claim Details -->
        <div *ngIf="currentStep === 'details'" class="bg-white rounded-lg shadow-lg p-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Claim {{ selectedBusiness?.business_name }}</h2>
          <p class="text-gray-600 mb-6">Provide your contact information to verify ownership.</p>

          <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 class="font-semibold text-gray-900 mb-2">Business Information</h3>
            <p class="text-sm text-gray-700">{{ selectedBusiness?.business_name }}</p>
            <p *ngIf="selectedBusiness?.address_line1" class="text-sm text-gray-600">
              {{ selectedBusiness?.address_line1 }}, {{ selectedBusiness?.city }}, {{ selectedBusiness?.state }}
            </p>
          </div>

          <form (ngSubmit)="submitClaim()" #claimForm="ngForm">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                <input type="text"
                       [(ngModel)]="claimData.contactName"
                       name="contactName"
                       required
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email"
                       [(ngModel)]="claimData.contactEmail"
                       name="contactEmail"
                       required
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel"
                       [(ngModel)]="claimData.contactPhone"
                       name="contactPhone"
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
                <textarea [(ngModel)]="claimData.message"
                          name="message"
                          rows="4"
                          placeholder="Tell us about your relationship to this business..."
                          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
              </div>
            </div>

            <div *ngIf="claimError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {{ claimError }}
            </div>

            <div class="mt-6 flex gap-3">
              <button type="button"
                      (click)="currentStep = 'search'"
                      class="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                ← Back
              </button>
              <button type="submit"
                      [disabled]="!claimForm.valid || isSubmitting"
                      class="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300">
                {{ isSubmitting ? 'Submitting...' : 'Submit Claim Request' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Step 4: Thank You -->
        <div *ngIf="currentStep === 'thank-you'" class="bg-white rounded-lg shadow-lg p-8 text-center">
          <div class="text-6xl mb-4">✅</div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Claim Request Submitted!</h2>
          <p class="text-gray-600 mb-6">
            Your claim for <strong>{{ selectedBusiness?.business_name }}</strong> has been submitted to 
            {{ selectedChamber?.name }} for review.
          </p>
          <p class="text-gray-600 mb-6">
            You'll receive an email at <strong>{{ claimData.contactEmail }}</strong> once your claim has been reviewed.
          </p>
          <button (click)="router.navigate(['/'])"
                  class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
            Return to Home
          </button>
        </div>
      </div>
    </div>
  `
})
export class ClaimWizardComponent implements OnInit {
  private claimService = inject(ClaimService);
  private chamberService = inject(ChamberService);
  router = inject(Router);

  currentStep: WizardStep = 'chamber';
  steps = [
    { value: 'chamber' as const, label: 'Chamber' },
    { value: 'search' as const, label: 'Find Business' },
    { value: 'details' as const, label: 'Details' },
    { value: 'thank-you' as const, label: 'Complete' }
  ];

  chambers: Chamber[] = [];
  isLoadingChambers = true;
  selectedChamber: Chamber | null = null;

  searchQuery = '';
  searchResults: CMMember[] = [];
  isSearching = false;
  searchTimeout: any = null;
  selectedBusiness: CMMember | null = null;

  claimData = {
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    message: ''
  };
  isSubmitting = false;
  claimError = '';

  ngOnInit() {
    this.loadChambers();
  }

  getCurrentStepIndex(): number {
    return this.steps.findIndex(s => s.value === this.currentStep);
  }

  async loadChambers() {
    this.isLoadingChambers = true;
    this.chamberService.getChambers().subscribe({
      next: (response) => {
        this.chambers = response.data || [];
        this.isLoadingChambers = false;
      },
      error: () => {
        this.isLoadingChambers = false;
      }
    });
  }

  selectChamber(chamber: Chamber) {
    this.selectedChamber = chamber;
    this.currentStep = 'search';
  }

  onSearchInput() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    this.searchTimeout = setTimeout(() => {
      this.performSearch();
    }, 300);
  }

  performSearch() {
    if (!this.selectedChamber || !this.searchQuery.trim()) {
      return;
    }

    this.isSearching = true;
    this.chamberService.searchMembers(this.selectedChamber.id, this.searchQuery).subscribe({
      next: (response) => {
        this.searchResults = response.data || [];
        this.isSearching = false;
      },
      error: () => {
        this.searchResults = [];
        this.isSearching = false;
      }
    });
  }

  selectBusiness(member: CMMember) {
    this.selectedBusiness = member;
    this.currentStep = 'details';
  }

  submitClaim() {
    if (!this.selectedChamber || !this.selectedBusiness) {
      return;
    }

    this.isSubmitting = true;
    this.claimError = '';

    const input: CreateClaimInput = {
      chamberId: this.selectedChamber.id,
      cmMemberId: this.selectedBusiness.id,
      contactEmail: this.claimData.contactEmail,
      contactName: this.claimData.contactName,
      contactPhone: this.claimData.contactPhone || undefined,
      message: this.claimData.message || undefined
    };

    this.claimService.createClaim(input).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.currentStep = 'thank-you';
      },
      error: (error) => {
        this.claimError = error.error?.error?.message || 'Failed to submit claim. Please try again.';
        this.isSubmitting = false;
      }
    });
  }
}
