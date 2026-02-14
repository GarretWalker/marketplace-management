import { Injectable, inject } from '@angular/core';
import { ApiService, ApiResponse } from '../../../core/api/api.service';
import { Observable } from 'rxjs';
import { ClaimRequest, CreateClaimInput, ClaimWithMemberData } from '../../../../../../shared/types/claim.types';
import { Merchant } from '../../../../../../shared/types/merchant.types';

@Injectable({
  providedIn: 'root'
})
export class ClaimService {
  private api = inject(ApiService);

  /**
   * Submit a new claim request
   */
  submitClaim(input: CreateClaimInput): Observable<ApiResponse<ClaimRequest>> {
    return this.api.post<ClaimRequest>('/claims', input);
  }

  /**
   * Get claims for a chamber
   */
  getClaims(chamberId: string, status?: string): Observable<ApiResponse<ClaimWithMemberData[]>> {
    const queryParts: string[] = [`chamber_id=${chamberId}`];
    if (status) {
      queryParts.push(`status=${status}`);
    }
    const queryString = '?' + queryParts.join('&');
    return this.api.get<ClaimWithMemberData[]>(`/claims${queryString}`);
  }

  /**
   * Approve a claim
   */
  approveClaim(claimId: string): Observable<ApiResponse<Merchant>> {
    return this.api.post<Merchant>(`/claims/${claimId}/approve`, {});
  }

  /**
   * Deny a claim
   */
  denyClaim(claimId: string, reason: string): Observable<ApiResponse<{ success: boolean }>> {
    return this.api.post<{ success: boolean }>(`/claims/${claimId}/deny`, { reason });
  }
}
