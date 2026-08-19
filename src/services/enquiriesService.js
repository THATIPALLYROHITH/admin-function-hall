import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';

const COLLECTION_NAME = 'enquiries';
const LOCAL_STORAGE_BACKUP_KEY = 'vlns_admin_firestore_enquiries_backup';

// Helper: load local persistent fallback
function getLocalEnquiries() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Helper: save local persistent fallback
function saveLocalEnquiries(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save to local backup store', e);
  }
}

/**
 * Add a new enquiry to Firestore (or local persistent backup).
 */
export async function createEnquiry(enquiryData) {
  const payload = {
    customerName: enquiryData.customerName?.trim() || '',
    phoneNumber: enquiryData.phoneNumber?.trim() || '',
    occasion: enquiryData.occasion || 'Wedding Ceremony',
    targetDate: enquiryData.targetDate || '',
    timeSlot: enquiryData.timeSlot || 'Full Day',
    estimatedGuests: enquiryData.estimatedGuests ? Number(enquiryData.estimatedGuests) : null,
    notes: enquiryData.notes ? enquiryData.notes.trim() : '',
    status: 'New',
    createdAt: new Date().toISOString(),
    source: enquiryData.source || 'admin_manual'
  };

  if (isFirebaseConfigured && db) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...payload,
        serverCreatedAt: serverTimestamp()
      });
      return { id: docRef.id, ...payload };
    } catch (err) {
      console.error('Firestore createEnquiry error:', err);
      throw err;
    }
  } else {
    // Persistent local backup fallback
    const list = getLocalEnquiries();
    const id = `ENQ-${String(list.length + 1).padStart(3, '0')}`;
    const newEnquiry = { id, ...payload };
    const updated = [newEnquiry, ...list];
    saveLocalEnquiries(updated);
    return newEnquiry;
  }
}

/**
 * Real-time listener for enquiries.
 */
export function subscribeEnquiries(onData, onError) {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt || (data.serverCreatedAt ? data.serverCreatedAt.toDate().toISOString() : new Date().toISOString())
            };
          });
          onData(items);
        },
        (error) => {
          console.error('Firestore onSnapshot subscription error:', error);
          if (onError) onError(error);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.error('Failed to attach Firestore snapshot listener:', err);
      if (onError) onError(err);
      return () => {};
    }
  } else {
    // If not yet connected to live Firebase credentials, provide stored persistent local enquiries
    const initialList = getLocalEnquiries();
    onData(initialList);

    // Listen to local storage events across tabs
    const handleStorageChange = (e) => {
      if (e.key === LOCAL_STORAGE_BACKUP_KEY) {
        onData(getLocalEnquiries());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }
}

/**
 * Delete an enquiry from Firestore (or local persistent backup).
 */
export async function removeEnquiry(id) {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error('Firestore deleteDoc error:', err);
      throw err;
    }
  } else {
    const list = getLocalEnquiries();
    const updated = list.filter((item) => item.id !== id);
    saveLocalEnquiries(updated);
    return true;
  }
}

/**
 * Update enquiry status in Firestore (or local persistent backup).
 */
export async function modifyEnquiryStatus(id, newStatus) {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (err) {
      console.error('Firestore updateDoc error:', err);
      throw err;
    }
  } else {
    const list = getLocalEnquiries();
    const updated = list.map((item) =>
      item.id === id ? { ...item, status: newStatus } : item
    );
    saveLocalEnquiries(updated);
    return true;
  }
}
