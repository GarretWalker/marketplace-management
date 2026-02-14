import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/api/api.service';
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
  submitClaim(input: CreateClaimInput): Observable<{ data: ClaimRequest }> {
    return this.api.post<{ data: ClaimRequest }>('/claims', input);
  }

  /**
   * Get claims for a chamber
   */
  getClaims(chamberId: string, status?: string): Observable<{ data: ClaimWithMemberData[] }> {
    const params: any = { chamber_id: chamberId };
    if (status) {
      params.status = status;
    }
    return this.api.get<{ data: ClaimWithMemberData[] }>('/claims', { params });
  }

  /**
   * Approve a claim
   */
  approveClaim(claimId: string): Observable<{ data: Merchant }> {
    return this.api.post<{ data: Merchant }>(`/claims/${claimId}/approve`, {});
  }

  /**
   * Deny a claim
   */
  denyClaim(claimId: string, reason: string): Observable<{ data: { success: boolean } }> {
    return this.api.post<{ data: { success: boolean } }>(`/claims/${claimId}/deny`, { reason });
  }
}
