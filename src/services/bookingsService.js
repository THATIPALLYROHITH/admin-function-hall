import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';

const COLLECTION_NAME = 'bookings';

/**
 * Normalize time slot string to canonical slot type: 'morning' | 'evening' | 'fullday'
 */
export function normalizeSlotType(timeSlot = '') {
  const lower = (timeSlot || '').toLowerCase();
  if (lower.includes('morning')) return 'morning';
  if (lower.includes('evening')) return 'evening';
  return 'fullday';
}

/**
 * Slot overlap comparison rule:
 * - Morning conflicts with Morning and Full Day
 * - Evening conflicts with Evening and Full Day
 * - Full Day conflicts with Morning, Evening, and Full Day
 * - Morning + Evening are allowed together on the same date
 */
export function doSlotsOverlap(slotA, slotB) {
  const a = normalizeSlotType(slotA);
  const b = normalizeSlotType(slotB);

  if (a === 'fullday' || b === 'fullday') return true;
  return a === b;
}

/**
 * Get human-readable display label for a time slot
 */
export function getSlotDisplayName(timeSlot = '') {
  const type = normalizeSlotType(timeSlot);
  if (type === 'morning') return 'Morning Slot';
  if (type === 'evening') return 'Evening Slot';
  return 'Full Day';
}

/**
 * Helper to derive payment status based on total contracted and paid amounts
 */
export function derivePaymentStatus(totalAmount, totalPaid) {
  const total = Number(totalAmount) || 0;
  const paid = Number(totalPaid) || 0;

  if (paid <= 0) return 'Pending';
  if (paid >= total) return 'Paid';
  return 'Partially Paid';
}

function ensureFirestore() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firestore is not configured. Financial operations require an active database connection.');
  }
}

/**
 * Authoritative availability and conflict checker
 * Ignores bookings where bookingStatus === 'Cancelled'
 */
export function checkBookingAvailability(eventDate, timeSlot, bookings = [], excludeBookingId = null) {
  if (!eventDate || !timeSlot) {
    return { available: true, conflictingBooking: null };
  }

  const cleanDate = (eventDate || '').trim();
  const conflictingBooking = bookings.find((b) => {
    if (excludeBookingId && b.id === excludeBookingId) return false;
    // Cancelled bookings never block availability
    if ((b.bookingStatus || '').toLowerCase() === 'cancelled') return false;
    if ((b.eventDate || '').trim() !== cleanDate) return false;
    return doSlotsOverlap(b.timeSlot, timeSlot);
  });

  if (conflictingBooking) {
    return {
      available: false,
      conflictingBooking: {
        id: conflictingBooking.id,
        customerName: conflictingBooking.customerName,
        occasion: conflictingBooking.occasion,
        eventDate: conflictingBooking.eventDate,
        timeSlot: conflictingBooking.timeSlot,
        bookingStatus: conflictingBooking.bookingStatus
      }
    };
  }

  return {
    available: true,
    conflictingBooking: null
  };
}

/**
 * Create a new booking with true atomic Firestore concurrency protection
 */
export async function createBooking(bookingData) {
  ensureFirestore();

  const totalAmount = Number(bookingData.totalAmount) || 0;
  if (totalAmount < 0) {
    throw new Error('Total booking amount cannot be negative.');
  }

  const eventDate = (bookingData.eventDate || '').trim();
  const timeSlot = bookingData.timeSlot || 'Full Day';
  const bookingStatus = bookingData.bookingStatus || 'Confirmed';

  if (!eventDate) {
    throw new Error('Event date is required for creating a reservation.');
  }

  const totalPaid = Number(bookingData.totalPaid) || 0;
  const balanceAmount = Math.max(0, totalAmount - totalPaid);
  const paymentStatus = derivePaymentStatus(totalAmount, totalPaid);

  const payload = {
    customerName: bookingData.customerName?.trim() || '',
    phoneNumber: bookingData.phoneNumber?.trim() || '',
    occasion: bookingData.occasion || 'Wedding Ceremony',
    eventDate,
    timeSlot,

    totalAmount,
    totalPaid,
    balanceAmount,

    paymentStatus,
    bookingStatus,

    estimatedGuests: bookingData.estimatedGuests ? Number(bookingData.estimatedGuests) : null,
    notes: bookingData.notes ? bookingData.notes.trim() : '',
    enquiryId: bookingData.enquiryId || null,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    serverCreatedAt: serverTimestamp(),
    serverUpdatedAt: serverTimestamp()
  };

  // If status is Cancelled, directly create without slot locking
  if (bookingStatus.toLowerCase() === 'cancelled') {
    const newDocRef = doc(collection(db, COLLECTION_NAME));
    await runTransaction(db, async (transaction) => {
      transaction.set(newDocRef, payload);
    });
    return { id: newDocRef.id, ...payload };
  }

  // 1. Pre-query existing bookings on this date (covers legacy auto-generated IDs)
  const dateQuery = query(
    collection(db, COLLECTION_NAME),
    where('eventDate', '==', eventDate)
  );
  const snap = await getDocs(dateQuery);
  const existingOnDate = snap.docs
    .filter((d) => !d.id.startsWith('_schedule_') && !d.data().isSystemSchedule)
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

  const preAvailability = checkBookingAvailability(eventDate, timeSlot, existingOnDate);
  if (!preAvailability.available) {
    const cb = preAvailability.conflictingBooking;
    const slotLabel = getSlotDisplayName(cb.timeSlot);
    const d = new Date(cb.eventDate + 'T00:00:00');
    const dateFormatted = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    throw new Error(
      `Booking conflict: ${dateFormatted} — ${slotLabel} is already reserved for ${cb.customerName || 'another customer'} (${cb.occasion || 'Private Event'}).`
    );
  }

  // 2. Atomic Slot Reservation via Firestore Transaction
  const slotType = normalizeSlotType(timeSlot);
  const morningDocRef = doc(db, COLLECTION_NAME, `slot_${eventDate}_morning`);
  const eveningDocRef = doc(db, COLLECTION_NAME, `slot_${eventDate}_evening`);
  const fulldayDocRef = doc(db, COLLECTION_NAME, `slot_${eventDate}_fullday`);

  const targetDocRef = slotType === 'morning'
    ? morningDocRef
    : slotType === 'evening'
    ? eveningDocRef
    : fulldayDocRef;

  try {
    await runTransaction(db, async (transaction) => {
      const morningSnap = await transaction.get(morningDocRef);
      const eveningSnap = await transaction.get(eveningDocRef);
      const fulldaySnap = await transaction.get(fulldayDocRef);

      const morningData = morningSnap.exists() ? morningSnap.data() : null;
      const eveningData = eveningSnap.exists() ? eveningSnap.data() : null;
      const fulldayData = fulldaySnap.exists() ? fulldaySnap.data() : null;

      let conflictingBooking = null;

      if (slotType === 'morning') {
        if (morningData && (morningData.bookingStatus || '').toLowerCase() !== 'cancelled') {
          conflictingBooking = morningData;
        } else if (fulldayData && (fulldayData.bookingStatus || '').toLowerCase() !== 'cancelled') {
          conflictingBooking = fulldayData;
        }
      } else if (slotType === 'evening') {
        if (eveningData && (eveningData.bookingStatus || '').toLowerCase() !== 'cancelled') {
          conflictingBooking = eveningData;
        } else if (fulldayData && (fulldayData.bookingStatus || '').toLowerCase() !== 'cancelled') {
          conflictingBooking = fulldayData;
        }
      } else if (slotType === 'fullday') {
        if (morningData && (morningData.bookingStatus || '').toLowerCase() !== 'cancelled') {
          conflictingBooking = morningData;
        } else if (eveningData && (eveningData.bookingStatus || '').toLowerCase() !== 'cancelled') {
          conflictingBooking = eveningData;
        } else if (fulldayData && (fulldayData.bookingStatus || '').toLowerCase() !== 'cancelled') {
          conflictingBooking = fulldayData;
        }
      }

      if (conflictingBooking) {
        const slotLabel = getSlotDisplayName(conflictingBooking.timeSlot);
        const d = new Date(eventDate + 'T00:00:00');
        const dateFormatted = d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        throw new Error(
          `Booking conflict: ${dateFormatted} — ${slotLabel} is already reserved for ${conflictingBooking.customerName || 'another customer'} (${conflictingBooking.occasion || 'Private Event'}).`
        );
      }

      // If target slot was previously cancelled, archive the cancelled document to preserve history
      const targetSnap = slotType === 'morning' ? morningSnap : slotType === 'evening' ? eveningSnap : fulldaySnap;
      if (targetSnap.exists()) {
        const oldCancelledData = targetSnap.data();
        const archiveRef = doc(db, COLLECTION_NAME, `cancelled_${eventDate}_${slotType}_${Date.now()}`);
        transaction.set(archiveRef, oldCancelledData);
      }

      // Write the new valid booking document atomically
      transaction.set(targetDocRef, payload);
    });

    return { id: targetDocRef.id, ...payload };
  } catch (err) {
    console.error('Firestore createBooking atomic transaction error:', err);
    throw err;
  }
}

/**
 * Real-time listener for bookings (filters out internal schedule documents if any)
 */
export function subscribeBookings(onData, onError) {
  if (!isFirebaseConfigured || !db) {
    if (onError) onError(new Error('Firestore is not configured.'));
    return () => {};
  }

  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('eventDate', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs
          .filter((docSnap) => !docSnap.id.startsWith('_schedule_') && !docSnap.data().isSystemSchedule)
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt || (data.serverCreatedAt ? data.serverCreatedAt.toDate().toISOString() : new Date().toISOString()),
              updatedAt: data.updatedAt || (data.serverUpdatedAt ? data.serverUpdatedAt.toDate().toISOString() : new Date().toISOString())
            };
          });
        onData(items);
      },
      (error) => {
        console.error('Firestore onSnapshot bookings error:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to attach Firestore bookings listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Fetch a single booking by ID
 */
export async function getBookingById(id) {
  ensureFirestore();

  if (id.startsWith('_schedule_')) return null;

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().isSystemSchedule) return null;
    return { id: docSnap.id, ...docSnap.data() };
  } catch (err) {
    console.error('Firestore getBookingById error:', err);
    throw err;
  }
}

/**
 * Update general booking details with conflict validation
 */
export async function updateBooking(id, updateData) {
  ensureFirestore();

  try {
    const docRef = doc(db, COLLECTION_NAME, id);

    return await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Booking #${id} does not exist.`);
      }

      const existingData = docSnap.data();
      const cleanUpdate = { ...updateData };

      const targetDate = (cleanUpdate.eventDate || existingData.eventDate || '').trim();
      const targetSlot = cleanUpdate.timeSlot || existingData.timeSlot || 'Full Day';
      const targetStatus = cleanUpdate.bookingStatus || existingData.bookingStatus || 'Confirmed';

      if (
        (cleanUpdate.eventDate && cleanUpdate.eventDate !== existingData.eventDate) ||
        (cleanUpdate.timeSlot && cleanUpdate.timeSlot !== existingData.timeSlot) ||
        (cleanUpdate.bookingStatus && cleanUpdate.bookingStatus !== existingData.bookingStatus)
      ) {
        if (targetStatus.toLowerCase() !== 'cancelled') {
          const targetSlotType = normalizeSlotType(targetSlot);
          const morningDocRef = doc(db, COLLECTION_NAME, `slot_${targetDate}_morning`);
          const eveningDocRef = doc(db, COLLECTION_NAME, `slot_${targetDate}_evening`);
          const fulldayDocRef = doc(db, COLLECTION_NAME, `slot_${targetDate}_fullday`);

          const morningSnap = await transaction.get(morningDocRef);
          const eveningSnap = await transaction.get(eveningDocRef);
          const fulldaySnap = await transaction.get(fulldayDocRef);

          const morningData = morningSnap.exists() && morningDocRef.id !== id ? morningSnap.data() : null;
          const eveningData = eveningSnap.exists() && eveningDocRef.id !== id ? eveningSnap.data() : null;
          const fulldayData = fulldaySnap.exists() && fulldayDocRef.id !== id ? fulldaySnap.data() : null;

          let conflictingBooking = null;

          if (targetSlotType === 'morning') {
            if (morningData && (morningData.bookingStatus || '').toLowerCase() !== 'cancelled') {
              conflictingBooking = morningData;
            } else if (fulldayData && (fulldayData.bookingStatus || '').toLowerCase() !== 'cancelled') {
              conflictingBooking = fulldayData;
            }
          } else if (targetSlotType === 'evening') {
            if (eveningData && (eveningData.bookingStatus || '').toLowerCase() !== 'cancelled') {
              conflictingBooking = eveningData;
            } else if (fulldayData && (fulldayData.bookingStatus || '').toLowerCase() !== 'cancelled') {
              conflictingBooking = fulldayData;
            }
          } else if (targetSlotType === 'fullday') {
            if (morningData && (morningData.bookingStatus || '').toLowerCase() !== 'cancelled') {
              conflictingBooking = morningData;
            } else if (eveningData && (eveningData.bookingStatus || '').toLowerCase() !== 'cancelled') {
              conflictingBooking = eveningData;
            } else if (fulldayData && (fulldayData.bookingStatus || '').toLowerCase() !== 'cancelled') {
              conflictingBooking = fulldayData;
            }
          }

          if (conflictingBooking) {
            const slotLabel = getSlotDisplayName(conflictingBooking.timeSlot);
            const d = new Date(targetDate + 'T00:00:00');
            const dateFormatted = d.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
            throw new Error(
              `Booking conflict: ${dateFormatted} — ${slotLabel} is already reserved for ${conflictingBooking.customerName || 'another customer'} (${conflictingBooking.occasion || 'Private Event'}).`
            );
          }
        }
      }

      // Ensure financial recalculation consistency
      if ('totalAmount' in cleanUpdate || 'totalPaid' in cleanUpdate) {
        const total = 'totalAmount' in cleanUpdate ? Number(cleanUpdate.totalAmount) : (existingData.totalAmount || 0);
        const paid = 'totalPaid' in cleanUpdate ? Number(cleanUpdate.totalPaid) : (existingData.totalPaid || 0);

        cleanUpdate.totalAmount = total;
        cleanUpdate.totalPaid = paid;
        cleanUpdate.balanceAmount = Math.max(0, total - paid);
        cleanUpdate.paymentStatus = derivePaymentStatus(total, paid);
      }

      cleanUpdate.updatedAt = new Date().toISOString();
      cleanUpdate.serverUpdatedAt = serverTimestamp();

      transaction.update(docRef, cleanUpdate);
      return true;
    });
  } catch (err) {
    console.error('Firestore updateBooking error:', err);
    throw err;
  }
}

/**
 * Update booking status (e.g. Tentative, Confirmed, Completed, Cancelled)
 */
export async function updateBookingStatus(id, newStatus) {
  return updateBooking(id, { bookingStatus: newStatus });
}

/**
 * Delete a booking
 */
export async function deleteBooking(id) {
  ensureFirestore();

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Firestore deleteBooking error:', err);
    throw err;
  }
}
