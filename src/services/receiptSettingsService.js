// VLNS Gardens — Venue Profile & Receipt Settings Service

export const DEFAULT_VENUE_SETTINGS = {
  venueName: 'VLNS Gardens',
  venueCategory: 'Convention Hall & Open Lawn',
  maximumGuestCapacity: '2,000+ Guests',
  diningCapacity: '600+ Seated',
  dedicatedParking: '250+ Vehicles',
  address: 'H.No: 7-155, Zaffargadh Road, Warangal, Telangana',
  phone: '+91 91000 05724',
  email: 'vlnsgardens@gmail.com',
  termsAndConditions: [
    'Balance amount must be fully settled prior to commencement of the event or decor setup.',
    'Hall setup and breakdown must strictly adhere to the allotted slot timings.',
    'Generator diesel for extra running hours and damages to venue property, if any, will be charged separately.',
    'Booking cancellations and slot rescheduling are subject to management approval and cancellation policies.'
  ].join('\n')
};

// Backward-compatible alias for existing imports
export const DEFAULT_RECEIPT_SETTINGS = DEFAULT_VENUE_SETTINGS;

const STORAGE_KEY = 'vlns_venue_profile_settings';

function getStorage() {
  if (typeof localStorage !== 'undefined') return localStorage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

/**
 * Retrieve the current venue profile settings from localStorage with default fallbacks.
 */
export function getVenueSettings() {
  try {
    const storage = getStorage();
    const raw = storage ? storage.getItem(STORAGE_KEY) : null;
    if (!raw) return { ...DEFAULT_VENUE_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_VENUE_SETTINGS,
      ...parsed
    };
  } catch (err) {
    console.error('Error loading venue settings from localStorage:', err);
    return { ...DEFAULT_VENUE_SETTINGS };
  }
}

// Backward-compatible alias
export const getReceiptSettings = getVenueSettings;

/**
 * Persist modified venue profile settings to localStorage.
 */
export function saveVenueSettings(settings) {
  try {
    const dataToSave = {
      venueName: (settings.venueName || DEFAULT_VENUE_SETTINGS.venueName).trim(),
      venueCategory: (settings.venueCategory || DEFAULT_VENUE_SETTINGS.venueCategory).trim(),
      maximumGuestCapacity: (settings.maximumGuestCapacity || DEFAULT_VENUE_SETTINGS.maximumGuestCapacity).trim(),
      diningCapacity: (settings.diningCapacity || DEFAULT_VENUE_SETTINGS.diningCapacity).trim(),
      dedicatedParking: (settings.dedicatedParking || DEFAULT_VENUE_SETTINGS.dedicatedParking).trim(),
      address: (settings.address || DEFAULT_VENUE_SETTINGS.address).trim(),
      phone: (settings.phone || DEFAULT_VENUE_SETTINGS.phone).trim(),
      email: (settings.email || DEFAULT_VENUE_SETTINGS.email).trim(),
      termsAndConditions: settings.termsAndConditions !== undefined
        ? settings.termsAndConditions.trim()
        : (settings.terms !== undefined ? settings.terms.trim() : DEFAULT_VENUE_SETTINGS.termsAndConditions)
    };
    const storage = getStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
    return dataToSave;
  } catch (err) {
    console.error('Error saving venue settings to localStorage:', err);
    throw err;
  }
}

// Backward-compatible alias
export const saveReceiptSettings = saveVenueSettings;

/**
 * Reset venue profile settings to standard defaults.
 */
export function resetVenueSettings() {
  try {
    const storage = getStorage();
    if (storage) {
      storage.removeItem(STORAGE_KEY);
    }
    return { ...DEFAULT_VENUE_SETTINGS };
  } catch (err) {
    console.error('Error resetting venue settings:', err);
    return { ...DEFAULT_VENUE_SETTINGS };
  }
}

// Backward-compatible alias
export const resetReceiptSettings = resetVenueSettings;
