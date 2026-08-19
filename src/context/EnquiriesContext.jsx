import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createEnquiry, 
  subscribeEnquiries, 
  removeEnquiry, 
  modifyEnquiryStatus 
} from '../services/enquiriesService';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from './AuthContext';

const EnquiriesContext = createContext(null);

export function EnquiriesProvider({ children }) {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const [enquiries, setEnquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subscribe to real-time updates from Firestore only after authentication is confirmed
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      setEnquiries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeEnquiries(
      (data) => {
        setEnquiries(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Enquiries subscription error:', err);
        setError(err.message || 'Failed to connect to enquiries database');
        setIsLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isAuthenticated, isAuthLoading]);

  // Add new enquiry
  const addEnquiry = async (data) => {
    try {
      setError(null);
      const created = await createEnquiry(data);
      // For local fallback or optimistic update if onSnapshot takes time
      if (!isFirebaseConfigured) {
        setEnquiries((prev) => {
          if (prev.some((item) => item.id === created.id)) return prev;
          return [created, ...prev];
        });
      }
      return created;
    } catch (err) {
      setError(err.message || 'Failed to save enquiry');
      throw err;
    }
  };

  // Delete enquiry
  const deleteEnquiry = async (id) => {
    try {
      setError(null);
      await removeEnquiry(id);
      if (!isFirebaseConfigured) {
        setEnquiries((prev) => prev.filter((item) => item.id !== id));
      }
      return true;
    } catch (err) {
      setError(err.message || 'Failed to delete enquiry');
      throw err;
    }
  };

  // Update status
  const updateEnquiryStatus = async (id, newStatus) => {
    try {
      setError(null);
      await modifyEnquiryStatus(id, newStatus);
      if (!isFirebaseConfigured) {
        setEnquiries((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
      }
      return true;
    } catch (err) {
      setError(err.message || 'Failed to update enquiry status');
      throw err;
    }
  };

  const value = {
    enquiries,
    isLoading,
    error,
    isFirebaseConfigured,
    addEnquiry,
    deleteEnquiry,
    updateEnquiryStatus
  };

  return (
    <EnquiriesContext.Provider value={value}>
      {children}
    </EnquiriesContext.Provider>
  );
}

export function useEnquiries() {
  const context = useContext(EnquiriesContext);
  if (!context) {
    throw new Error('useEnquiries must be used within an EnquiriesProvider');
  }
  return context;
}
