import { SupabaseClient } from '@supabase/supabase-js';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../utils/logger';

/**
 * ChamberMaster Integration Service
 *
 * Handles synchronization of member data from ChamberMaster API to local database.
 * Supports both mock mode (for development/testing) and live mode (production).
 *
 * Key Features:
 * - Mock/Live mode toggle via CHAMBERMASTER_MOCK environment variable
 * - Parses both member list and detailed member formats
 * - Upserts members (adds new, updates existing, tracks deactivations)
 * - Logs all sync operations to sync_log table
 * - Maps ChamberMaster status codes to our simplified status enum
 *
 * Environment Variables:
 * - CHAMBERMASTER_MOCK: Set to 'true' to use mock data instead of live API
 * - CHAMBERMASTER_MOCK_PATH: Optional path to mock data JSON file
 */

// ChamberMaster status codes
export enum ChamberMasterStatus {
  Prospective = 1,
  Active = 2,
  Courtesy = 4,
  NonMember = 8,
  Inactive = 16,
  Deleted = 32,
}

// Member list response (from /members endpoint)
interface CMListMember {
  Id: string;
  Name: string;
  DisplayName?: string;
  Email?: string;
  LogoUrl?: string;
  SearchLogoUrl?: string;
  Status: number;
  StatusText: string;
  Latitude?: string;
  Longitude?: string;
  Level?: number;
  WebParticipationLevel?: string;
  DisplayFlags?: number;
  DoNotDisplayOnWeb?: string;
  MembershipEstablished?: string;
  Slug?: string;
  DropDate?: string | null;
}

// Member details response (from /members/details or /members({id})/details)
interface CMDetailedMember {
  Id: string;
  Name: string;
  DisplayName?: string;
  Email?: string;
  Phone?: string;
  Fax?: string;
  Address1?: string;
  Address2?: string;
  City?: string;
  State?: string;
  Zip?: string;
  Country?: string;
  Website?: string;
  Description?: string;
  LogoUrl?: string;
  SearchLogoUrl?: string;
  Status: number;
  StatusText: string;
  Latitude?: string;
  Longitude?: string;
  Level?: number;
  Categories?: Array<{ Id: number; Name: string }>;
  PrimaryContact?: string;
  PrimaryContactEmail?: string;
  PrimaryContactPhone?: string;
  MembershipEstablished?: string;
  MembershipType?: string;
  Slug?: string;
  SocialNetworks?: Record<string, string | null>;
  WebParticipationLevel?: string;
  DisplayFlags?: number;
  DoNotDisplayOnWeb?: string;
  DropDate?: string | null;
}

// Mapped member for our database
export interface MappedChamberMember {
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
}

// Sync result
export interface SyncResult {
  success: boolean;
  membersAdded: number;
  membersUpdated: number;
  membersDeactivated: number;
  errorMessage?: string;
}

export class ChamberMasterService {
  private client: AxiosInstance | null = null;
  private useMock: boolean;
  private mockDataPath: string;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.useMock = process.env.CHAMBERMASTER_MOCK === 'true';

    // Use __dirname for reliable path resolution
    // Falls back to environment variable if provided
    this.mockDataPath =
      process.env.CHAMBERMASTER_MOCK_PATH ||
      path.join(__dirname, '../../../../chambermaster_mock_data.json');

    logger.info(`ChamberMaster service initialized in ${this.useMock ? 'MOCK' : 'LIVE'} mode`);
  }

  /**
   * Initialize the HTTP client for live mode
   *
   * Creates an Axios instance configured for ChamberMaster API calls.
   * Only called when not in mock mode.
   *
   * @param baseUrl - ChamberMaster API base URL (e.g., http://secure2.chambermaster.com/api)
   * @param apiKey - Chamber's ChamberMaster API key
   */
  private initClient(baseUrl: string, apiKey: string): void {
    if (this.useMock) return;

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'X-ApiKey': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Fetch members list from ChamberMaster API or mock data
   *
   * In live mode: Calls GET /associations({customerId})/members with optional status filter
   * In mock mode: Reads from mock data file and filters locally
   *
   * @param customerId - ChamberMaster association/customer ID
   * @param statusFilter - Optional ChamberMaster status code to filter by (e.g., 2 for Active)
   * @returns Array of member list records (basic fields)
   */
  private async fetchMembersList(customerId: string, statusFilter?: number): Promise<CMListMember[]> {
    if (this.useMock) {
      return this.fetchMockMembersList(statusFilter);
    }

    if (!this.client) {
      throw new Error('ChamberMaster client not initialized. Call initClient first.');
    }

    try {
      const filterParam = statusFilter ? `?$filter=Status+eq+${statusFilter}` : '';
      const response = await this.client.get(`/associations(${customerId})/members/${filterParam}`);
      return response.data as CMListMember[];
    } catch (error) {
      logger.error('Failed to fetch ChamberMaster members list', { error });
      throw new Error('ChamberMaster API request failed');
    }
  }

  /**
   * Fetch member details from ChamberMaster API or mock data
   *
   * In live mode: Calls GET /associations({customerId})/members/details
   * In mock mode: Reads from mock data file
   *
   * This endpoint returns more complete member information than the list endpoint,
   * including address, categories, contact details, etc.
   *
   * @param customerId - ChamberMaster association/customer ID
   * @returns Array of detailed member records
   */
  private async fetchMemberDetails(customerId: string): Promise<CMDetailedMember[]> {
    if (this.useMock) {
      return this.fetchMockMemberDetails();
    }

    if (!this.client) {
      throw new Error('ChamberMaster client not initialized. Call initClient first.');
    }

    try {
      const response = await this.client.get(`/associations(${customerId})/members/details`);
      return response.data as CMDetailedMember[];
    } catch (error) {
      logger.error('Failed to fetch ChamberMaster member details', { error });
      throw new Error('ChamberMaster API request failed');
    }
  }

  /**
   * Load mock data from JSON file
   *
   * Reads the chambermaster_mock_data.json file which contains sample member data
   * for development and testing without calling the real ChamberMaster API.
   *
   * @returns Parsed JSON object with members_list_response and member_details_response
   * @throws Error if file not found or invalid JSON
   */
  private async loadMockData(): Promise<any> {
    try {
      const rawData = await fs.readFile(this.mockDataPath, 'utf-8');
      return JSON.parse(rawData);
    } catch (error) {
      logger.error('Failed to load mock ChamberMaster data', { error, path: this.mockDataPath });
      throw new Error('Mock data file not found or invalid');
    }
  }

  /**
   * Fetch members from mock data (list format)
   */
  private async fetchMockMembersList(statusFilter?: number): Promise<CMListMember[]> {
    const mockData = await this.loadMockData();
    let members = mockData.members_list_response as CMListMember[];

    if (statusFilter) {
      members = members.filter((m) => m.Status === statusFilter);
    }

    logger.info(`Loaded ${members.length} members from mock data (list format)`);
    return members;
  }

  /**
   * Fetch members from mock data (details format)
   */
  private async fetchMockMemberDetails(): Promise<CMDetailedMember[]> {
    const mockData = await this.loadMockData();
    const members = mockData.member_details_response as CMDetailedMember[];
    logger.info(`Loaded ${members.length} members from mock data (details format)`);
    return members;
  }

  /**
   * Map ChamberMaster member to our database format
   *
   * Transforms ChamberMaster's data structure to our chambermaster_members table schema.
   * Handles both list and detailed member formats.
   *
   * Key transformations:
   * - Maps status codes to our simplified enum (active/inactive/prospective)
   * - Extracts first category if multiple categories exist
   * - Uses DisplayName over Name if available
   * - Handles optional fields gracefully
   *
   * @param member - ChamberMaster member data (list or detail format)
   * @returns Mapped member ready for database insertion
   */
  private mapMemberToDatabase(member: CMListMember | CMDetailedMember): MappedChamberMember {
    // Determine member status based on status code
    let memberStatus: 'active' | 'inactive' | 'prospective' = 'active';
    if (member.Status === ChamberMasterStatus.Inactive || member.Status === ChamberMasterStatus.Deleted) {
      memberStatus = 'inactive';
    } else if (member.Status === ChamberMasterStatus.Prospective) {
      memberStatus = 'prospective';
    }

    // Extract category (first one if multiple)
    let category: string | undefined;
    if ('Categories' in member && member.Categories && member.Categories.length > 0) {
      category = member.Categories[0].Name;
    }

    // Extract contact name
    let contactName: string | undefined;
    if ('PrimaryContact' in member) {
      contactName = member.PrimaryContact;
    }

    // Build mapped member
    const mapped: MappedChamberMember = {
      cm_member_id: member.Id,
      business_name: member.DisplayName || member.Name,
      contact_name: contactName,
      email: member.Email,
      phone: 'Phone' in member ? member.Phone : undefined,
      website_url: 'Website' in member ? member.Website : undefined,
      address_line1: 'Address1' in member ? member.Address1 : undefined,
      address_line2: 'Address2' in member ? member.Address2 : undefined,
      city: 'City' in member ? member.City : undefined,
      state: 'State' in member ? member.State : undefined,
      zip: 'Zip' in member ? member.Zip : undefined,
      category,
      member_status: memberStatus,
      member_status_code: member.Status,
    };

    return mapped;
  }

  /**
   * Sync members from ChamberMaster to database
   *
   * Main sync operation that:
   * 1. Creates a sync_log entry to track the operation
   * 2. Fetches members from ChamberMaster API (or mock data)
   * 3. Upserts each member into chambermaster_members table
   * 4. Tracks counts of added/updated/deactivated members
   * 5. Updates chamber's chambermaster_last_sync_at timestamp
   * 6. Marks sync_log as completed or failed
   *
   * Upsert logic:
   * - If member exists (by cm_member_id): updates record and tracks if status changed to inactive
   * - If member doesn't exist: inserts new record
   *
   * Fallback strategy:
   * - First attempts to fetch detailed member data (more complete info)
   * - If that fails, falls back to list format with active filter
   *
   * @param chamberId - Our database chamber ID
   * @param customerId - ChamberMaster association/customer ID
   * @param apiKey - ChamberMaster API key
   * @param baseUrl - ChamberMaster API base URL (default: http://secure2.chambermaster.com/api)
   * @returns SyncResult with success flag and counts
   */
  async syncMembers(
    chamberId: string,
    customerId: string,
    apiKey: string,
    baseUrl: string = 'http://secure2.chambermaster.com/api'
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      membersAdded: 0,
      membersUpdated: 0,
      membersDeactivated: 0,
    };

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await this.supabase
      .from('sync_log')
      .insert({
        chamber_id: chamberId,
        sync_type: 'chambermaster',
        status: 'started',
      })
      .select()
      .single();

    if (syncLogError || !syncLog) {
      logger.error('Failed to create sync log', { error: syncLogError });
      return { ...result, errorMessage: 'Failed to create sync log' };
    }

    try {
      // Initialize client if in live mode
      if (!this.useMock) {
        this.initClient(baseUrl, apiKey);
      }

      // Fetch members (try detailed format first, fall back to list)
      // Details format is preferred as it includes more complete information (address, categories, etc.)
      let members: (CMListMember | CMDetailedMember)[];
      try {
        // Try to get detailed member data
        members = await this.fetchMemberDetails(customerId);
        logger.info('Fetched members in details format');
      } catch (detailsError) {
        // Fall back to list format with active filter
        // Some ChamberMaster accounts may not have the details endpoint enabled
        logger.info('Details endpoint failed, falling back to list format with active filter');
        members = await this.fetchMembersList(customerId, ChamberMasterStatus.Active);
      }

      // Map and upsert each member
      for (const member of members) {
        const mapped = this.mapMemberToDatabase(member);

        // Check if member already exists
        const { data: existing } = await this.supabase
          .from('chambermaster_members')
          .select('id, member_status')
          .eq('chamber_id', chamberId)
          .eq('cm_member_id', mapped.cm_member_id)
          .single();

        if (existing) {
          // Update existing member
          const { error: updateError } = await this.supabase
            .from('chambermaster_members')
            .update({
              ...mapped,
              chamber_id: chamberId,
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateError) {
            logger.error('Failed to update member', { error: updateError, memberId: mapped.cm_member_id });
          } else {
            result.membersUpdated++;

            // Track deactivation
            if (existing.member_status === 'active' && mapped.member_status !== 'active') {
              result.membersDeactivated++;
            }
          }
        } else {
          // Insert new member
          const { error: insertError } = await this.supabase
            .from('chambermaster_members')
            .insert({
              ...mapped,
              chamber_id: chamberId,
              last_synced_at: new Date().toISOString(),
            });

          if (insertError) {
            logger.error('Failed to insert member', { error: insertError, memberId: mapped.cm_member_id });
          } else {
            result.membersAdded++;
          }
        }
      }

      // Update chambers.chambermaster_last_sync_at
      await this.supabase
        .from('chambers')
        .update({ chambermaster_last_sync_at: new Date().toISOString() })
        .eq('id', chamberId);

      // Mark sync as completed
      await this.supabase
        .from('sync_log')
        .update({
          status: 'completed',
          members_added: result.membersAdded,
          members_updated: result.membersUpdated,
          members_deactivated: result.membersDeactivated,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id);

      result.success = true;
      logger.info('ChamberMaster sync completed successfully', result);

      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error during sync';
      logger.error('ChamberMaster sync failed', { error });

      // Update sync log with failure
      await this.supabase
        .from('sync_log')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id);

      return { ...result, errorMessage };
    }
  }

  /**
   * Get sync status for a chamber
   *
   * Returns information about the most recent ChamberMaster sync.
   *
   * @param chamberId - Chamber ID to get sync status for
   * @returns Object containing last sync timestamp and most recent sync log entry
   */
  async getSyncStatus(chamberId: string): Promise<{
    lastSyncAt: string | null;
    lastSyncResult: any;
  }> {
    // Get chamber's last sync timestamp
    const { data: chamber } = await this.supabase
      .from('chambers')
      .select('chambermaster_last_sync_at')
      .eq('id', chamberId)
      .single();

    // Get most recent sync log entry
    const { data: lastSync } = await this.supabase
      .from('sync_log')
      .select('*')
      .eq('chamber_id', chamberId)
      .eq('sync_type', 'chambermaster')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    return {
      lastSyncAt: chamber?.chambermaster_last_sync_at || null,
      lastSyncResult: lastSync || null,
    };
  }
}
