import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/api/api.service';
import { Observable } from 'rxjs';
import { Merchant, UpdateMerchantInput } from '../../../../../../shared/types/merchant.types';

@Injectable({
  providedIn: 'root'
})
export class MerchantService {
  private api = inject(ApiService);

  /**
   * Get current merchant's record
   */
  getMe(): Observable<{ data: Merchant }> {
    return this.api.get<{ data: Merchant }>('/merchants/me');
  }

  /**
   * Update current merchant's settings
   */
  updateMe(input: UpdateMerchantInput): Observable<{ data: Merchant }> {
    return this.api.put<{ data: Merchant }>('/merchants/me', input);
  }
}
