import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { 
  ClaimRequest, 
  CreateClaimInput, 
  ClaimWithMemberData 
} from '../../../../../../shared/types/claim.types';

interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
}

@Injectable({
  providedIn: 'root'
})
export class ClaimService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/claims`;

  createClaim(input: CreateClaimInput): Observable<ApiResponse<ClaimRequest>> {
    return this.http.post<ApiResponse<ClaimRequest>>(this.baseUrl, input);
  }

  getClaims(chamberId: string, status?: string): Observable<ApiResponse<ClaimWithMemberData[]>> {
    const params: any = { chamber_id: chamberId };
    if (status) {
      params.status = status;
    }
    return this.http.get<ApiResponse<ClaimWithMemberData[]>>(this.baseUrl, { params });
  }

  approveClaim(claimId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${claimId}/approve`, {});
  }

  denyClaim(claimId: string, reason: string): Observable<ApiResponse<ClaimRequest>> {
    return this.http.post<ApiResponse<ClaimRequest>>(`${this.baseUrl}/${claimId}/deny`, { reason });
  }
}
