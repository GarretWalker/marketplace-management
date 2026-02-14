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

export interface ChamberMember {
  id: string;
  chamber_id: string;
  cm_member_id: string;
  business_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website_url?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  category?: string;
  member_status: 'active' | 'inactive' | 'prospective';
  member_status_code: number;
  is_claimed: boolean;
  claimed_by?: string;
  claimed_at?: string;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  success: boolean;
  membersAdded: number;
  membersUpdated: number;
  membersDeactivated: number;
  errorMessage?: string;
}

export interface SyncStatus {
  lastSyncAt: string | null;
  lastSyncResult: {
    id: string;
    chamber_id: string;
    sync_type: string;
    status: string;
    members_added: number;
    members_updated: number;
    members_deactivated: number;
    error_message?: string;
    started_at: string;
    completed_at?: string;
  } | null;
}

export interface GetMembersParams {
  status?: 'active' | 'inactive' | 'prospective';
  is_claimed?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Chamber Service - Manages chamber-related API calls
 *
 * Handles:
 * - Chamber creation during setup wizard
 * - Fetching chamber details for dashboard
 * - Updating chamber information
 * - Managing branding assets (logo, hero image)
 * - ChamberMaster sync and member roster management
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

  /**
   * Trigger ChamberMaster sync
   * Pulls member data from ChamberMaster API and updates local database
   */
  syncChamberMaster(chamberId: string): Observable<ApiResponse<SyncResult>> {
    return this.api.post<SyncResult>(`/chambers/${chamberId}/sync`, {});
  }

  /**
   * Get synced members for a chamber
   * Supports filtering by status, claimed status, and search
   */
  getMembers(chamberId: string, params?: GetMembersParams): Observable<ApiResponse<ChamberMember[]>> {
    const queryParts: string[] = [];
    
    if (params?.status) queryParts.push(`status=${params.status}`);
    if (params?.is_claimed !== undefined) queryParts.push(`is_claimed=${params.is_claimed}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);

    const queryString = queryParts.length > 0 ? '?' + queryParts.join('&') : '';
    return this.api.get<ChamberMember[]>(`/chambers/${chamberId}/members${queryString}`);
  }

  /**
   * Get sync status for a chamber
   * Returns last sync time and result details
   */
  getSyncStatus(chamberId: string): Observable<ApiResponse<SyncStatus>> {
    return this.api.get<SyncStatus>(`/chambers/${chamberId}/sync-status`);
  }
}
