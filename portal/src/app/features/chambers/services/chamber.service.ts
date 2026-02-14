import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from '../../../core/api/api.service';

export interface Chamber {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  contact_email: string;
  phone?: string;
  website_url?: string;
  chambermaster_association_id?: string;
  chambermaster_api_key?: string;
  chambermaster_base_url?: string;
  chambermaster_sync_enabled: boolean;
  logo_url?: string;
  hero_image_url?: string;
  primary_color: string;
  accent_color: string;
  tagline?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateChamberInput {
  name: string;
  slug: string;
  city: string;
  state: string;
  contact_email: string;
  phone?: string;
  website_url?: string;
  chambermaster_association_id?: string;
  chambermaster_api_key?: string;
  chambermaster_base_url?: string;
  chambermaster_sync_enabled?: boolean;
}

export interface UpdateChamberInput {
  name?: string;
  city?: string;
  state?: string;
  contact_email?: string;
  phone?: string;
  website_url?: string;
  tagline?: string;
  logo_url?: string;
  hero_image_url?: string;
  primary_color?: string;
  accent_color?: string;
  chambermaster_association_id?: string;
  chambermaster_api_key?: string;
  chambermaster_base_url?: string;
  chambermaster_sync_enabled?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChamberService {
  private api = inject(ApiService);

  createChamber(input: CreateChamberInput): Observable<ApiResponse<Chamber>> {
    return this.api.post<Chamber>('/chambers', input);
  }

  getChamber(id: string): Observable<ApiResponse<Chamber>> {
    return this.api.get<Chamber>(`/chambers/${id}`);
  }

  updateChamber(id: string, input: UpdateChamberInput): Observable<ApiResponse<Chamber>> {
    return this.api.put<Chamber>(`/chambers/${id}`, input);
  }

  updateBranding(id: string, branding: { logo_url?: string; hero_image_url?: string }): Observable<ApiResponse<Chamber>> {
    return this.api.post<Chamber>(`/chambers/${id}/branding`, branding);
  }
}
