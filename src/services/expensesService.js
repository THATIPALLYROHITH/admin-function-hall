import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  where 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';

const COLLECTION_NAME = 'expenses';

export const EXPENSE_CATEGORIES = [
  'Electricity',
  'Water',
  'Maintenance',
  'Cleaning',
  'Staff',
  'Decoration',
  'Repairs',
  'Marketing',
  'Supplies',
  'Other'
];

function ensureFirestore() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firestore is not configured. Expense operations require an active database connection.');
  }
}

/**
 * Record a new operational or venue expense
 */
export async function createExpense(expenseData) {
  ensureFirestore();

  const amount = Number(expenseData.amount) || 0;
  if (amount <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }

  const payload = {
    category: expenseData.category || 'Maintenance',
    amount,
    expenseDate: expenseData.expenseDate || new Date().toISOString().slice(0, 10),
    paymentMethod: expenseData.paymentMethod || 'Cash',
    description: expenseData.description?.trim() || '',
    payee: expenseData.payee?.trim() || '',
    transactionReference: expenseData.transactionReference ? expenseData.transactionReference.trim() : '',
    notes: expenseData.notes ? expenseData.notes.trim() : '',
    recordedBy: expenseData.recordedBy || 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    serverCreatedAt: serverTimestamp(),
    serverUpdatedAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), payload);
    return { id: docRef.id, ...payload };
  } catch (err) {
    console.error('Firestore createExpense error:', err);
    throw err;
  }
}

/**
 * Subscribe to real-time expenses (optionally filtered by category)
 */
export function subscribeExpenses(onData, onError, optionalCategory = null) {
  if (!isFirebaseConfigured || !db) {
    if (onError) onError(new Error('Firestore is not configured.'));
    return () => {};
  }

  try {
    let q = optionalCategory
      ? query(
          collection(db, COLLECTION_NAME),
          where('category', '==', optionalCategory),
          orderBy('expenseDate', 'desc')
        )
      : query(collection(db, COLLECTION_NAME), orderBy('expenseDate', 'desc'));

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
        console.error('Firestore onSnapshot expenses error:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to attach Firestore expenses listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Update an existing expense record
 */
export async function updateExpense(id, updateData) {
  ensureFirestore();

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const cleanUpdate = {
      ...updateData,
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: serverTimestamp()
    };
    if ('amount' in cleanUpdate) {
      const amt = Number(cleanUpdate.amount) || 0;
      if (amt <= 0) throw new Error('Expense amount must be greater than zero.');
      cleanUpdate.amount = amt;
    }
    await updateDoc(docRef, cleanUpdate);
    return true;
  } catch (err) {
    console.error('Firestore updateExpense error:', err);
    throw err;
  }
}

/**
 * Delete an expense record
 */
export async function deleteExpense(id) {
  ensureFirestore();

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Firestore deleteExpense error:', err);
    throw err;
  }
}
