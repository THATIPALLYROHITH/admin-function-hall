import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  where,
  runTransaction 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { derivePaymentStatus } from './bookingsService';

const PAYMENTS_COLLECTION = 'payments';
const BOOKINGS_COLLECTION = 'bookings';

function ensureFirestore() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firestore is not configured. Payment operations require an active database connection.');
  }
}

/**
 * Record a new payment using an atomic Firestore transaction.
 * Updates both the payments collection and the associated booking's totals in a single atomic commit.
 */
export async function createPayment(paymentData) {
  ensureFirestore();

  const amount = Number(paymentData.amount) || 0;
  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const bookingId = paymentData.bookingId || null;
  const paymentPayload = {
    bookingId,
    customerName: paymentData.customerName?.trim() || '',
    amount,
    paymentDate: paymentData.paymentDate || new Date().toISOString().slice(0, 10),
    paymentMethod: paymentData.paymentMethod || 'UPI',
    transactionReference: paymentData.transactionReference ? paymentData.transactionReference.trim() : '',
    notes: paymentData.notes ? paymentData.notes.trim() : '',
    status: 'Completed', // 'Completed' | 'Voided'
    recordedBy: paymentData.recordedBy || 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    return await runTransaction(db, async (transaction) => {
      // 1. If associated with a booking, read and update the booking atomically
      if (bookingId) {
        const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
        const bookingSnap = await transaction.get(bookingRef);

        if (bookingSnap.exists()) {
          const bData = bookingSnap.data();
          const currentPaid = Number(bData.totalPaid) || 0;
          const totalAmount = Number(bData.totalAmount) || 0;

          const newPaid = currentPaid + amount;
          const newBalance = Math.max(0, totalAmount - newPaid);
          const newPaymentStatus = derivePaymentStatus(totalAmount, newPaid);

          transaction.update(bookingRef, {
            totalPaid: newPaid,
            balanceAmount: newBalance,
            paymentStatus: newPaymentStatus,
            updatedAt: new Date().toISOString(),
            serverUpdatedAt: serverTimestamp()
          });
        }
      }

      // 2. Create the immutable payment record
      const paymentRef = doc(collection(db, PAYMENTS_COLLECTION));
      transaction.set(paymentRef, {
        ...paymentPayload,
        serverCreatedAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp()
      });

      return { id: paymentRef.id, ...paymentPayload };
    });
  } catch (err) {
    console.error('Firestore atomic createPayment error:', err);
    throw err;
  }
}

/**
 * Void/Cancel a payment using an atomic Firestore transaction.
 * Preserves the payment document with status 'Voided' and audit details,
 * while atomically adjusting the booking's totalPaid and balanceAmount.
 */
export async function voidPayment(paymentId, voidReason = 'Cancelled by administrator', voidedBy = 'admin') {
  ensureFirestore();

  if (!paymentId) {
    throw new Error('Payment ID is required to void a payment.');
  }

  try {
    return await runTransaction(db, async (transaction) => {
      const paymentRef = doc(db, PAYMENTS_COLLECTION, paymentId);
      const paymentSnap = await transaction.get(paymentRef);

      if (!paymentSnap.exists()) {
        throw new Error(`Payment #${paymentId} does not exist.`);
      }

      const pData = paymentSnap.data();
      if (pData.status === 'Voided') {
        throw new Error(`Payment #${paymentId} has already been voided.`);
      }

      const amountToRevert = Number(pData.amount) || 0;
      const bookingId = pData.bookingId;

      // 1. If associated with a booking, adjust the booking totals atomically
      if (bookingId && amountToRevert > 0) {
        const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
        const bookingSnap = await transaction.get(bookingRef);

        if (bookingSnap.exists()) {
          const bData = bookingSnap.data();
          const currentPaid = Number(bData.totalPaid) || 0;
          const totalAmount = Number(bData.totalAmount) || 0;

          const newPaid = Math.max(0, currentPaid - amountToRevert);
          const newBalance = Math.max(0, totalAmount - newPaid);
          const newPaymentStatus = derivePaymentStatus(totalAmount, newPaid);

          transaction.update(bookingRef, {
            totalPaid: newPaid,
            balanceAmount: newBalance,
            paymentStatus: newPaymentStatus,
            updatedAt: new Date().toISOString(),
            serverUpdatedAt: serverTimestamp()
          });
        }
      }

      // 2. Mark payment as Voided with audit trail
      transaction.update(paymentRef, {
        status: 'Voided',
        voidReason: voidReason.trim(),
        voidedBy: voidedBy || 'admin',
        voidedAt: new Date().toISOString(),
        serverVoidedAt: serverTimestamp(),
        updatedAt: new Date().toISOString(),
        serverUpdatedAt: serverTimestamp()
      });

      return true;
    });
  } catch (err) {
    console.error('Firestore atomic voidPayment error:', err);
    throw err;
  }
}

/**
 * Subscribe to real-time payments (optionally filtered by bookingId)
 */
export function subscribePayments(onData, onError, optionalBookingId = null) {
  if (!isFirebaseConfigured || !db) {
    if (onError) onError(new Error('Firestore is not configured.'));
    return () => {};
  }

  try {
    let q = optionalBookingId
      ? query(
          collection(db, PAYMENTS_COLLECTION),
          where('bookingId', '==', optionalBookingId),
          orderBy('paymentDate', 'desc')
        )
      : query(collection(db, PAYMENTS_COLLECTION), orderBy('paymentDate', 'desc'));

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
        console.error('Firestore onSnapshot payments error:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to attach Firestore payments listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Fetch all payments for a specific booking
 */
export async function getPaymentsByBookingId(bookingId) {
  ensureFirestore();
  if (!bookingId) return [];

  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('bookingId', '==', bookingId),
      orderBy('paymentDate', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.error('Firestore getPaymentsByBookingId error:', err);
    throw err;
  }
}
