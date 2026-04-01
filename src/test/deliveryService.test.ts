import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  listDeliveryDrivers,
  createDeliveryDriver,
  listDeliveryAssignments,
  assignDeliveryOrder,
  updateDeliveryStatus
} from '@/services/deliveryService';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
            data: [],
            error: null
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

describe('Delivery Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listDeliveryDrivers', () => {
    it('should return list of delivery drivers', async () => {
      const mockDrivers = [
        { id: '1', full_name: 'John Doe', phone_number: '1234567890', status: 'available' }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockDrivers, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await listDeliveryDrivers();
      expect(result).toEqual(mockDrivers);
    });

    it('should throw error on database failure', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      await expect(listDeliveryDrivers()).rejects.toThrow('DB Error');
    });
  });

  describe('createDeliveryDriver', () => {
    it('should create and return new delivery driver', async () => {
      const driverData = {
        full_name: 'Jane Smith',
        phone_number: '0987654321',
        vehicle_plate: 'ABC123',
        branch_id: 'branch-1'
      };

      const mockDriver = { id: '2', ...driverData, status: 'available' };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDriver, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await createDeliveryDriver(driverData);
      expect(result).toEqual(mockDriver);
    });
  });

  describe('assignDeliveryOrder', () => {
    it('should assign delivery order and update statuses', async () => {
      const params = {
        order_id: 'order-1',
        driver_id: 'driver-1',
        branch_id: 'branch-1',
        assigned_by: 'staff-1',
        eta_minutes: 30
      };

      const mockAssignment = { id: 'assignment-1', ...params, status: 'awaiting_pickup' };

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAssignment, error: null })
      };

      const mockUpdateDriverQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      const mockUpdateOrderQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      (supabase.from as any)
        .mockReturnValueOnce(mockInsertQuery)
        .mockReturnValueOnce(mockUpdateDriverQuery)
        .mockReturnValueOnce(mockUpdateOrderQuery);

      const result = await assignDeliveryOrder(params);
      expect(result).toEqual(mockAssignment);
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should update delivery status and handle driver availability', async () => {
      const assignmentId = 'assignment-1';
      const status = 'delivered';

      const mockAssignment = {
        id: assignmentId,
        driver_id: 'driver-1',
        order_id: 'order-1',
        status: 'en_route'
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { ...mockAssignment, status }, error: null })
      };

      const mockDriverUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      const mockOrderUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      (supabase.from as any)
        .mockReturnValueOnce(mockUpdateQuery)
        .mockReturnValueOnce(mockDriverUpdateQuery)
        .mockReturnValueOnce(mockOrderUpdateQuery);

      const result = await updateDeliveryStatus(assignmentId, status);
      expect(result.status).toBe(status);
    });
  });
});