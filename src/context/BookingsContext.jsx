import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  subscribeBookings,
  createBooking as svcCreateBooking,
  updateBooking as svcUpdateBooking,
  updateBookingStatus as svcUpdateBookingStatus,
  deleteBooking as svcDeleteBooking,
} from '../services/bookingsService';
import { useAuth } from './AuthContext';

const BookingsContext = createContext(null);

export function BookingsProvider({ children }) {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subscribe to real-time Firestore updates only when authenticated
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeBookings(
      (data) => {
        setBookings(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Bookings subscription error:', err);
        setError(err.message || 'Failed to connect to bookings database.');
        setIsLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isAuthenticated, isAuthLoading]);

  // Create a new booking
  const createBooking = async (data) => {
    try {
      setError(null);
      const created = await svcCreateBooking(data);
      return created;
    } catch (err) {
      setError(err.message || 'Failed to create booking.');
      throw err;
    }
  };

  // Update an existing booking
  const updateBooking = async (id, data) => {
    try {
      setError(null);
      await svcUpdateBooking(id, data);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to update booking.');
      throw err;
    }
  };

  // Update booking status only
  const updateBookingStatus = async (id, newStatus) => {
    try {
      setError(null);
      await svcUpdateBookingStatus(id, newStatus);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to update booking status.');
      throw err;
    }
  };

  // Delete a booking
  const deleteBooking = async (id) => {
    try {
      setError(null);
      await svcDeleteBooking(id);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to delete booking.');
      throw err;
    }
  };

  const value = {
    bookings,
    isLoading,
    error,
    createBooking,
    updateBooking,
    updateBookingStatus,
    deleteBooking,
  };

  return (
    <BookingsContext.Provider value={value}>
      {children}
    </BookingsContext.Provider>
  );
}

export function useBookings() {
  const context = useContext(BookingsContext);
  if (!context) {
    throw new Error('useBookings must be used within a BookingsProvider');
  }
  return context;
}
