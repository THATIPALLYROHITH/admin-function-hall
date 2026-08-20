import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  runTransaction 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';

const COLLECTION_NAME = 'bookings';

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
 * Create a new booking
 */
export async function createBooking(bookingData) {
  ensureFirestore();

  const totalAmount = Number(bookingData.totalAmount) || 0;
  if (totalAmount < 0) {
    throw new Error('Total booking amount cannot be negative.');
  }

  const totalPaid = Number(bookingData.totalPaid) || 0;
  const balanceAmount = Math.max(0, totalAmount - totalPaid);
  const paymentStatus = derivePaymentStatus(totalAmount, totalPaid);

  const payload = {
    customerName: bookingData.customerName?.trim() || '',
    phoneNumber: bookingData.phoneNumber?.trim() || '',
    occasion: bookingData.occasion || 'Wedding Ceremony',
    eventDate: bookingData.eventDate || '',
    timeSlot: bookingData.timeSlot || 'Full Day',
    
    totalAmount,
    totalPaid,
    balanceAmount,
    
    paymentStatus,
    bookingStatus: bookingData.bookingStatus || 'Confirmed',
    
    estimatedGuests: bookingData.estimatedGuests ? Number(bookingData.estimatedGuests) : null,
    notes: bookingData.notes ? bookingData.notes.trim() : '',
    enquiryId: bookingData.enquiryId || null,
    
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    serverCreatedAt: serverTimestamp(),
    serverUpdatedAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), payload);
    return { id: docRef.id, ...payload };
  } catch (err) {
    console.error('Firestore createBooking error:', err);
    throw err;
  }
}

/**
 * Real-time listener for bookings
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
        const items = snapshot.docs.map((docSnap) => {
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

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() };
  } catch (err) {
    console.error('Firestore getBookingById error:', err);
    throw err;
  }
}

/**
 * Update general booking details using an atomic transaction if totals change
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
