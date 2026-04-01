import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { POSProvider } from '@/contexts/POSContext';
import POSLayout from '@/components/pos/POSLayout';

/**
 * Main POS Page
 * Wraps POSLayout with POSProvider for state management
 */
export default function POS() {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  if (!user || !session) {
    navigate('/auth');
    return null;
  }

  return (
    <POSProvider>
      <POSLayout />
    </POSProvider>
  );
}
