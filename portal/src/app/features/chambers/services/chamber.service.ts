import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from '../../../core/api/api.service';

/**
 * Chamber domain model - represents a Chamber of Commerce organization
 */
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

/**
 * Chamber Service - Manages chamber-related API calls
 *
 * Handles:
 * - Chamber creation during setup wizard
 * - Fetching chamber details for dashboard
 * - Updating chamber information
 * - Managing branding assets (logo, hero image)
 */
@Injectable({
  providedIn: 'root'
})
export class ChamberService {
  private api = inject(ApiService);

  /**
   * Create a new chamber (called during setup wizard)
   * Also links the chamber to the current user's profile
   */
  createChamber(input: CreateChamberInput): Observable<ApiResponse<Chamber>> {
    return this.api.post<Chamber>('/chambers', input);
  }

  /**
   * Get chamber details by ID
   * Used to load chamber data on dashboard
   */
  getChamber(id: string): Observable<ApiResponse<Chamber>> {
    return this.api.get<Chamber>(`/chambers/${id}`);
  }

  /**
   * Update chamber information
   * Used for editing chamber details after initial setup
   */
  updateChamber(id: string, input: UpdateChamberInput): Observable<ApiResponse<Chamber>> {
    return this.api.put<Chamber>(`/chambers/${id}`, input);
  }

  /**
   * Update chamber branding assets (logo and hero image URLs)
   * Separate endpoint from general updates for focused branding management
   */
  updateBranding(id: string, branding: { logo_url?: string; hero_image_url?: string }): Observable<ApiResponse<Chamber>> {
    return this.api.post<Chamber>(`/chambers/${id}/branding`, branding);
  }
}
