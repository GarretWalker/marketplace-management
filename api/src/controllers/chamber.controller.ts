import { Request, Response, NextFunction } from 'express';
import { chamberService } from '../services/chamber.service';
import { ChamberMasterService } from '../services/integrations/chambermaster.service';
import { supabase } from '../config/supabase';

const chamberMasterService = new ChamberMasterService(supabase);

export const chamberController = {
  /**
   * Create a new chamber
   * POST /api/chambers
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          data: null,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
        });
        return;
      }

      const chamber = await chamberService.create(userId, req.body);
      res.status(201).json({ data: chamber, error: null });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get chamber by ID
   * GET /api/chambers/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chamber = await chamberService.getById(req.params.id, req.user?.id);
      res.json({ data: chamber, error: null });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update chamber details
   * PUT /api/chambers/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chamber = await chamberService.update(
        req.params.id,
        req.user?.id,
        req.body
      );
      res.json({ data: chamber, error: null });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Upload chamber branding assets (logo, hero image)
   * POST /api/chambers/:id/branding
   */
  async uploadBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await chamberService.uploadBranding(
        req.params.id,
        req.user?.id,
        req.body
      );
      res.json({ data: result, error: null });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Trigger ChamberMaster sync
   * POST /api/chambers/:id/sync
   *
   * Initiates a manual sync of member data from ChamberMaster API to local database.
   * Uses the chamber's stored ChamberMaster credentials (association ID and API key).
   * Creates a sync_log entry to track the operation.
   *
   * @param req.params.id - Chamber ID to sync
   * @returns SyncResult with counts of members added/updated/deactivated
   * @throws 404 if chamber not found
   * @throws 400 if ChamberMaster integration not configured
   * @throws 500 if sync fails
   */
  async syncChamberMaster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chamberId = req.params.id;

      // Get chamber details to retrieve ChamberMaster config
      const { data: chamber, error: chamberError } = await supabase
        .from('chambers')
        .select('chambermaster_association_id, chambermaster_api_key, chambermaster_base_url')
        .eq('id', chamberId)
        .single();

      if (chamberError || !chamber) {
        res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Chamber not found' }
        });
        return;
      }

      if (!chamber.chambermaster_association_id || !chamber.chambermaster_api_key) {
        res.status(400).json({
          data: null,
          error: { code: 'INVALID_CONFIG', message: 'ChamberMaster integration not configured' }
        });
        return;
      }

      // Trigger sync with the chamber's ChamberMaster association ID
      const result = await chamberMasterService.syncMembers(
        chamberId,
        chamber.chambermaster_association_id,
        chamber.chambermaster_api_key,
        chamber.chambermaster_base_url || 'http://secure2.chambermaster.com/api'
      );

      if (result.success) {
        res.json({ data: result, error: null });
      } else {
        res.status(500).json({
          data: result,
          error: { code: 'SYNC_FAILED', message: result.errorMessage || 'Sync failed' }
        });
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get synced members for a chamber
   * GET /api/chambers/:id/members
   *
   * Retrieves the list of ChamberMaster members that have been synced to the database.
   * Supports filtering by status, claimed status, and search by business name.
   * Returns paginated results.
   *
   * @param req.params.id - Chamber ID
   * @param req.query.status - Filter by member status (active/inactive/prospective)
   * @param req.query.is_claimed - Filter by claimed status (true/false)
   * @param req.query.search - Search by business name (case-insensitive partial match)
   * @param req.query.page - Page number (default: 1)
   * @param req.query.limit - Items per page (default: 50)
   * @returns Paginated list of members with meta information
   */
  async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chamberId = req.params.id;
      const { status, is_claimed, search, page = '1', limit = '50' } = req.query;

      let query = supabase
        .from('chambermaster_members')
        .select('*', { count: 'exact' })
        .eq('chamber_id', chamberId);

      // Apply filters
      if (status && typeof status === 'string') {
        query = query.eq('member_status', status);
      }

      if (is_claimed !== undefined) {
        query = query.eq('is_claimed', is_claimed === 'true');
      }

      if (search && typeof search === 'string') {
        query = query.ilike('business_name', `%${search}%`);
      }

      // Pagination
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      query = query
        .order('business_name', { ascending: true })
        .range(offset, offset + limitNum - 1);

      const { data: members, error, count } = await query;

      if (error) {
        throw error;
      }

      res.json({
        data: members,
        error: null,
        meta: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get sync status for a chamber
   * GET /api/chambers/:id/sync-status
   *
   * Returns information about the most recent ChamberMaster sync for this chamber.
   * Includes the last sync timestamp and the results (members added/updated/deactivated).
   *
   * @param req.params.id - Chamber ID
   * @returns Object with lastSyncAt timestamp and lastSyncResult details
   */
  async getSyncStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chamberId = req.params.id;
      const status = await chamberMasterService.getSyncStatus(chamberId);
      res.json({ data: status, error: null });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all active chambers (public endpoint)
   * GET /api/chambers
   *
   * Used by the claim wizard to show available chambers to prospective merchants.
   * Only returns active chambers with minimal information (id, name, slug, location).
   */
  async getAllActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chambers = await chamberService.getAllActive();
      res.json({ data: chambers, error: null });
    } catch (error) {
      next(error);
    }
  }
};
