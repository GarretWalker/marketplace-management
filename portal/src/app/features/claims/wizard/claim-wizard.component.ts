import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ClaimService } from '../services/claim.service';
import { environment } from '../../../../environments/environment';

interface Chamber {
  id: string;
  name: string;
  slug: string;
}

interface Member {
  id: string;
  business_name: string;
  address_line1?: string;
  city?: string;
  state?: string;
  phone?: string;
}

@Component({
  selector: 'app-claim-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-12 px-4">
      <div class="max-w-3xl mx-auto">
        <!-- Progress Steps -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div *ngFor="let s of steps; let i = index" class="flex-1">
              <div class="flex items-center" [class.text-blue-600]="currentStep >= i + 1" [class.text-gray-400]="currentStep < i + 1">
                <div class="flex items-center justify-center w-10 h-10 rounded-full border-2" 
                     [class.bg-blue-600]="currentStep >= i + 1"
                     [class.border-blue-600]="currentStep >= i + 1"
                     [class.border-gray-300]="currentStep < i + 1">
                  <span class="text-white font-semibold" *ngIf="currentStep >= i + 1">{{ i + 1 }}</span>
                  <span class="font-semibold" *ngIf="currentStep < i + 1">{{ i + 1 }}</span>
                </div>
                <span class="ml-2 text-sm font-medium hidden md:inline">{{ s }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-8">
          <!-- Step 1: Select Chamber -->
          <div *ngIf="currentStep === 1">
            <h2 class="text-2xl font-bold mb-4">Select Your Chamber</h2>
            <p class="text-gray-600 mb-6">Choose the chamber of commerce you're a member of</p>
            <div class="space-y-3">
              <button *ngFor="let chamber of chambers" 
                      (click)="selectChamber(chamber)"
                      class="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
                <div class="font-semibold text-lg">{{ chamber.name }}</div>
              </button>
            </div>
            <div *ngIf="isLoading" class="text-center py-8 text-gray-600">Loading chambers...</div>
          </div>

          <!-- Step 2: Search Business -->
          <div *ngIf="currentStep === 2">
            <h2 class="text-2xl font-bold mb-4">Find Your Business</h2>
            <p class="text-gray-600 mb-6">Search for your business in the chamber roster</p>
            <form [formGroup]="searchForm" (ngSubmit)="searchBusiness()">
              <div class="mb-4">
                <input 
                  type="text" 
                  formControlName="searchQuery"
                  placeholder="Search business name..."
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button type="submit" [disabled]="!searchForm.value.searchQuery || isSearching"
                      class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300">
                {{ isSearching ? 'Searching...' : 'Search' }}
              </button>
            </form>

            <div *ngIf="searchResults.length > 0" class="mt-6 space-y-3">
              <button *ngFor="let member of searchResults" 
                      (click)="selectBusiness(member)"
                      class="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">
                <div class="font-semibold">{{ member.business_name }}</div>
                <div class="text-sm text-gray-600">
                  {{ member.address_line1 }}, {{ member.city }}, {{ member.state }}
                </div>
                <div class="text-sm text-gray-600" *ngIf="member.phone">{{ member.phone }}</div>
              </button>
            </div>

            <div *ngIf="searchResults.length === 0 && hasSearched" class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              No businesses found. Try a different search term.
            </div>

            <button (click)="currentStep = 1" class="mt-6 text-blue-600 hover:text-blue-700">
              ← Back to Chamber Selection
            </button>
          </div>

          <!-- Step 3: Submit Claim -->
          <div *ngIf="currentStep === 3">
            <h2 class="text-2xl font-bold mb-4">Claim Your Business</h2>
            <p class="text-gray-600 mb-6">Confirm your details and submit your claim</p>
            
            <div class="mb-6 p-4 bg-gray-50 rounded-lg">
              <div class="font-semibold text-lg mb-2">{{ selectedBusiness?.business_name }}</div>
              <div class="text-sm text-gray-600">{{ selectedBusiness?.address_line1 }}</div>
            </div>

            <form [formGroup]="claimForm" (ngSubmit)="submitClaim()">
              <div class="mb-4">
                <label class="block text-sm font-medium mb-2">Your Name</label>
                <input type="text" formControlName="contactName"
                       class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium mb-2">Email</label>
                <input type="email" formControlName="contactEmail"
                       class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium mb-2">Phone</label>
                <input type="tel" formControlName="contactPhone"
                       class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>

              <div class="mb-6">
                <label class="block text-sm font-medium mb-2">Message (Optional)</label>
                <textarea formControlName="message" rows="3"
                          placeholder="Tell us about yourself and your role at the business..."
                          class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
              </div>

              <div *ngIf="errorMessage" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {{ errorMessage }}
              </div>

              <div class="flex gap-4">
                <button type="button" (click)="currentStep = 2"
                        class="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                  Back
                </button>
                <button type="submit" [disabled]="claimForm.invalid || isSubmitting"
                        class="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300">
                  {{ isSubmitting ? 'Submitting...' : 'Submit Claim' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Step 4: Thank You -->
          <div *ngIf="currentStep === 4">
            <div class="text-center py-8">
              <div class="text-6xl mb-4">✅</div>
              <h2 class="text-3xl font-bold mb-4">Claim Submitted!</h2>
              <p class="text-gray-600 mb-8">
                Your chamber admin will review your request. You'll receive an email once it's approved.
              </p>
              <button (click)="router.navigate(['/merchant/dashboard'])"
                      class="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ClaimWizardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private claimService = inject(ClaimService);
  router = inject(Router);

  currentStep = 1;
  steps = ['Select Chamber', 'Find Business', 'Submit Claim', 'Complete'];

  chambers: Chamber[] = [];
  selectedChamber: Chamber | null = null;
  
  searchResults: Member[] = [];
  selectedBusiness: Member | null = null;
  hasSearched = false;

  isLoading = false;
  isSearching = false;
  isSubmitting = false;
  errorMessage = '';

  searchForm = this.fb.group({
    searchQuery: ['']
  });

  claimForm = this.fb.group({
    contactName: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
    contactPhone: [''],
    message: ['']
  });

  async ngOnInit() {
    await this.loadChambers();
  }

  async loadChambers() {
    this.isLoading = true;
    try {
      const response: any = await this.http.get(`${environment.apiUrl}/chambers`).toPromise();
      this.chambers = response.data || [];
    } catch (error) {
      console.error('Failed to load chambers', error);
    }
    this.isLoading = false;
  }

  selectChamber(chamber: Chamber) {
    this.selectedChamber = chamber;
    this.currentStep = 2;
  }

  async searchBusiness() {
    if (!this.searchForm.value.searchQuery || !this.selectedChamber) return;

    this.isSearching = true;
    this.hasSearched = true;
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/chambers/${this.selectedChamber.id}/members`,
        { params: { search: this.searchForm.value.searchQuery } }
      ).toPromise();
      
      this.searchResults = response.data || [];
    } catch (error) {
      console.error('Search failed', error);
      this.searchResults = [];
    }
    this.isSearching = false;
  }

  selectBusiness(member: Member) {
    this.selectedBusiness = member;
    this.currentStep = 3;
  }

  async submitClaim() {
    if (this.claimForm.invalid || !this.selectedChamber || !this.selectedBusiness) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const input = {
      chamberId: this.selectedChamber.id,
      cmMemberId: this.selectedBusiness.id,
      contactName: this.claimForm.value.contactName!,
      contactEmail: this.claimForm.value.contactEmail!,
      contactPhone: this.claimForm.value.contactPhone || undefined,
      message: this.claimForm.value.message || undefined
    };

    this.claimService.submitClaim(input).subscribe({
      next: () => {
        this.currentStep = 4;
      },
      error: (error) => {
        this.errorMessage = error.error?.error?.message || 'Failed to submit claim';
        this.isSubmitting = false;
      }
    });
  }
}
