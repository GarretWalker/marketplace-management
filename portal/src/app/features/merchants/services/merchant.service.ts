import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface Merchant {
  id: string;
  businessName: string;
  status: 'active' | 'pending' | 'suspended';
  stripeOnboardingComplete: boolean;
  stripePayoutsEnabled: boolean;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
}

@Injectable({
  providedIn: 'root'
})
export class MerchantService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/merchants`;

  getMe(): Observable<ApiResponse<Merchant>> {
    return this.http.get<ApiResponse<Merchant>>(`${this.baseUrl}/me`);
  }

  getMerchant(): Observable<ApiResponse<Merchant>> {
    return this.getMe();
  }

  updateMerchant(updates: Partial<Merchant>): Observable<ApiResponse<Merchant>> {
    return this.http.patch<ApiResponse<Merchant>>(`${this.baseUrl}/me`, updates);
  }
}
