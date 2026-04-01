import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  requestInventoryTransfer,
  getTransferRequests,
  updateTransferRequestStatus
} from '@/services/inventorySyncService';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          eq: vi.fn(() => ({
            or: vi.fn(() => ({
              single: vi.fn(),
              data: [],
              error: null
            }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        single: vi.fn(() => ({
          data: {},
          error: null
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {},
            error: null
          }))
        }))
      }))
    }))
  }
}));

describe('Inventory Sync Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requestInventoryTransfer', () => {
    it('should create inventory transfer request', async () => {
      const params = {
        from_branch_id: 'branch-1',
        to_branch_id: 'branch-2',
        inventory_id: 'inventory-1',
        quantity: 10,
        requested_by: 'staff-1',
        notes: 'Urgent transfer'
      };

      const mockRequest = {
        id: 'request-1',
        ...params,
        status: 'requested',
        requested_at: new Date().toISOString()
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRequest, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await requestInventoryTransfer(params);
      expect(result).toEqual(mockRequest);
    });

    it('should throw error on database failure', async () => {
      const params = {
        from_branch_id: 'branch-1',
        to_branch_id: 'branch-2',
        inventory_id: 'inventory-1',
        quantity: 5,
        requested_by: 'staff-1'
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      await expect(requestInventoryTransfer(params)).rejects.toThrow('Insert failed');
    });
  });

  describe('getTransferRequests', () => {
    it('should return transfer requests for specific branch', async () => {
      const branchId = 'branch-1';
      const mockRequests = [
        {
          id: 'request-1',
          from_branch_id: branchId,
          to_branch_id: 'branch-2',
          status: 'requested',
          quantity: 15
        }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockRequests, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getTransferRequests(branchId);
      expect(result).toEqual(mockRequests);
    });

    it('should return all transfer requests when no branch specified', async () => {
      const mockRequests = [
        { id: 'request-1', status: 'approved' },
        { id: 'request-2', status: 'requested' }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockRequests, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getTransferRequests();
      expect(result).toEqual(mockRequests);
    });
  });

  describe('updateTransferRequestStatus', () => {
    it('should update transfer request status', async () => {
      const params = {
        requestId: 'request-1',
        status: 'approved' as const,
        approved_by: 'staff-2',
        notes: 'Approved for transfer'
      };

      const mockUpdatedRequest = {
        id: params.requestId,
        status: params.status,
        approved_by: params.approved_by,
        decided_at: expect.any(String),
        notes: params.notes
      };

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedRequest, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await updateTransferRequestStatus(params);
      expect(result.status).toBe('approved');
      expect(result.approved_by).toBe('staff-2');
    });

    it('should handle rejection status', async () => {
      const params = {
        requestId: 'request-1',
        status: 'rejected' as const,
        approved_by: 'staff-2'
      };

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: params.requestId, status: 'rejected' },
          error: null
        })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await updateTransferRequestStatus(params);
      expect(result.status).toBe('rejected');
    });
  });
});