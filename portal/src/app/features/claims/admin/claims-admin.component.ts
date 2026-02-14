import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClaimService } from '../services/claim.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ClaimWithMemberData } from '../../../../../../shared/types/claim.types';

@Component({
  selector: 'app-claims-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 py-6">
          <h1 class="text-3xl font-bold text-gray-900">Business Claim Requests</h1>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- Filter Tabs -->
        <div class="mb-6 border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button 
              *ngFor="let tab of tabs"
              (click)="currentTab = tab.value; loadClaims()"
              class="py-4 px-1 border-b-2 font-medium text-sm transition"
              [class.border-blue-500]="currentTab === tab.value"
              [class.text-blue-600]="currentTab === tab.value"
              [class.border-transparent]="currentTab !== tab.value"
              [class.text-gray-500]="currentTab !== tab.value">
              {{ tab.label }}
              <span *ngIf="tab.count !== undefined" class="ml-2 px-2 py-1 text-xs rounded-full"
                    [class.bg-blue-100]="currentTab === tab.value"
                    [class.text-blue-600]="currentTab === tab.value"
                    [class.bg-gray-100]="currentTab !== tab.value"
                    [class.text-gray-600]="currentTab !== tab.value">
                {{ tab.count }}
              </span>
            </button>
          </nav>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex justify-center py-12">
          <div class="text-gray-600">Loading claims...</div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading && claims.length === 0" class="bg-white rounded-lg shadow p-12 text-center">
          <div class="text-6xl mb-4">📋</div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">No Claims Found</h3>
          <p class="text-gray-600">There are no {{ currentTab }} claim requests.</p>
        </div>

        <!-- Claims List -->
        <div *ngIf="!isLoading && claims.length > 0" class="space-y-4">
          <div *ngFor="let claim of claims" class="bg-white rounded-lg shadow overflow-hidden">
            <div class="p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-gray-900">{{ claim.member.business_name }}</h3>
                  <div class="mt-1 text-sm text-gray-600">
                    Requested {{ claim.created_at | date:'short' }}
                  </div>
                </div>
                <div class="ml-4">
                  <span class="px-3 py-1 text-xs font-semibold rounded-full"
                        [ngClass]="{
                          'bg-yellow-100 text-yellow-800': claim.status === 'pending',
                          'bg-green-100 text-green-800': claim.status === 'approved',
                          'bg-red-100 text-red-800': claim.status === 'denied'
                        }">
                    {{ claim.status | uppercase }}
                  </span>
                </div>
              </div>

              <!-- Side-by-side comparison -->
              <div class="grid md:grid-cols-2 gap-6 mb-4">
                <!-- ChamberMaster Member Data -->
                <div class="border rounded-lg p-4 bg-gray-50">
                  <h4 class="font-semibold text-gray-900 mb-3">ChamberMaster Record</h4>
                  <div class="space-y-2 text-sm">
                    <div>
                      <span class="text-gray-600">Business:</span>
                      <span class="ml-2 font-medium">{{ claim.member.business_name }}</span>
                    </div>
                    <div *ngIf="claim.member.address_line1">
                      <span class="text-gray-600">Address:</span>
                      <span class="ml-2 font-medium">{{ claim.member.address_line1 }}, {{ claim.member.city }}, {{ claim.member.state }} {{ claim.member.zip }}</span>
                    </div>
                    <div *ngIf="claim.member.phone">
                      <span class="text-gray-600">Phone:</span>
                      <span class="ml-2 font-medium">{{ claim.member.phone }}</span>
                    </div>
                    <div *ngIf="claim.member.email">
                      <span class="text-gray-600">Email:</span>
                      <span class="ml-2 font-medium">{{ claim.member.email }}</span>
                    </div>
                    <div>
                      <span class="text-gray-600">Member Status:</span>
                      <span class="ml-2 font-medium">{{ claim.member.member_status }}</span>
                    </div>
                  </div>
                </div>

                <!-- Claim Request Contact Info -->
                <div class="border rounded-lg p-4 bg-blue-50">
                  <h4 class="font-semibold text-gray-900 mb-3">Claim Request Details</h4>
                  <div class="space-y-2 text-sm">
                    <div>
                      <span class="text-gray-600">Contact Name:</span>
                      <span class="ml-2 font-medium">{{ claim.contact_name }}</span>
                    </div>
                    <div>
                      <span class="text-gray-600">Contact Email:</span>
                      <span class="ml-2 font-medium">{{ claim.contact_email }}</span>
                    </div>
                    <div *ngIf="claim.contact_phone">
                      <span class="text-gray-600">Contact Phone:</span>
                      <span class="ml-2 font-medium">{{ claim.contact_phone }}</span>
                    </div>
                    <div *ngIf="claim.message">
                      <span class="text-gray-600">Message:</span>
                      <div class="ml-2 mt-1 p-2 bg-white rounded text-gray-700">{{ claim.message }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action Buttons (only for pending) -->
              <div *ngIf="claim.status === 'pending'" class="flex gap-3">
                <button 
                  (click)="approveClaim(claim)"
                  [disabled]="processingClaimId === claim.id"
                  class="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition">
                  {{ processingClaimId === claim.id ? 'Approving...' : '✓ Approve Claim' }}
                </button>
                <button 
                  (click)="openDenyModal(claim)"
                  [disabled]="processingClaimId === claim.id"
                  class="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition">
                  ✗ Deny Claim
                </button>
              </div>

              <!-- Approved/Denied Info -->
              <div *ngIf="claim.status === 'approved'" class="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                <strong>Approved</strong> on {{ claim.approved_at | date:'short' }}
                <span *ngIf="claim.approved_by"> by Admin</span>
              </div>
              <div *ngIf="claim.status === 'denied'" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <strong>Denied</strong> on {{ claim.denied_at | date:'short' }}
                <span *ngIf="claim.denial_reason">
                  <br><span class="text-sm">Reason: {{ claim.denial_reason }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Deny Modal -->
    <div *ngIf="showDenyModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 class="text-xl font-bold text-gray-900 mb-4">Deny Claim Request</h3>
        <p class="text-gray-600 mb-4">
          Please provide a reason for denying this claim. This will be sent to the merchant.
        </p>
        <textarea 
          [(ngModel)]="denyReason"
          rows="4"
          placeholder="Enter reason for denial..."
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-4"></textarea>
        <div class="flex gap-3">
          <button 
            (click)="closeDenyModal()"
            class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
            Cancel
          </button>
          <button 
            (click)="confirmDeny()"
            [disabled]="!denyReason.trim() || isDenying"
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300">
            {{ isDenying ? 'Denying...' : 'Confirm Deny' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ClaimsAdminComponent implements OnInit {
  private claimService = inject(ClaimService);
  private authService = inject(AuthService);

  claims: ClaimWithMemberData[] = [];
  isLoading = true;
  processingClaimId: string | null = null;

  currentTab: 'pending' | 'all' = 'pending';
  tabs = [
    { label: 'Pending', value: 'pending' as const, count: 0 },
    { label: 'All Claims', value: 'all' as const }
  ];

  showDenyModal = false;
  selectedClaim: ClaimWithMemberData | null = null;
  denyReason = '';
  isDenying = false;

  async ngOnInit() {
    await this.loadClaims();
  }

  async loadClaims() {
    this.isLoading = true;
    const profile = this.authService.currentProfile;
    
    if (!profile?.chamber_id) {
      this.isLoading = false;
      return;
    }

    const status = this.currentTab === 'pending' ? 'pending' : undefined;
    
    this.claimService.getClaims(profile.chamber_id, status).subscribe({
      next: (response) => {
        this.claims = response.data;
        
        // Update pending count
        const pendingCount = this.claims.filter(c => c.status === 'pending').length;
        this.tabs[0].count = pendingCount;
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load claims', error);
        this.isLoading = false;
      }
    });
  }

  async approveClaim(claim: ClaimWithMemberData) {
    if (!confirm(`Approve claim for ${claim.member.business_name}?`)) {
      return;
    }

    this.processingClaimId = claim.id;
    
    this.claimService.approveClaim(claim.id).subscribe({
      next: () => {
        this.processingClaimId = null;
        this.loadClaims();
      },
      error: (error) => {
        alert('Failed to approve claim: ' + (error.error?.error?.message || 'Unknown error'));
        this.processingClaimId = null;
      }
    });
  }

  openDenyModal(claim: ClaimWithMemberData) {
    this.selectedClaim = claim;
    this.denyReason = '';
    this.showDenyModal = true;
  }

  closeDenyModal() {
    this.showDenyModal = false;
    this.selectedClaim = null;
    this.denyReason = '';
  }

  async confirmDeny() {
    if (!this.selectedClaim || !this.denyReason.trim()) {
      return;
    }

    this.isDenying = true;
    
    this.claimService.denyClaim(this.selectedClaim.id, this.denyReason).subscribe({
      next: () => {
        this.isDenying = false;
        this.closeDenyModal();
        this.loadClaims();
      },
      error: (error) => {
        alert('Failed to deny claim: ' + (error.error?.error?.message || 'Unknown error'));
        this.isDenying = false;
      }
    });
  }
}
