# VLNS Gardens — Owner & Admin Web Application

Dedicated, modern, and responsive Owner/Admin web application for **VLNS Gardens** (Banquet & Function Hall Management).

---

## 🏛️ Project Information
- **Application Type**: Owner & Venue Administration Dashboard
- **Directory**: `C:\Users\dhaar\.gemini\antigravity\scratch\vlns-gardens-admin`
- **Tech Stack**: React 19, Vite, Firebase Authentication & Cloud Firestore, Lucide Icons, Vanilla CSS

---

## 🔐 Authentication Architecture
- **Provider**: Firebase Authentication (Email/Password)
- **Session Persistence**: Managed securely via Firebase Auth (`onAuthStateChanged`)
- **Zero Hard-Coded Credentials**: All credentials are authenticated remotely via Firebase Identity & Access Management.
- **Admin Account Creation**: Administrators are created and managed via the Firebase Console (**Authentication > Users > Add User**).

---

## 🚀 Running the Admin Application

To start the local development server:

```powershell
cd C:\Users\dhaar\.gemini\antigravity\scratch\vlns-gardens-admin
npm run dev
```

The application will be accessible at: `http://localhost:5174`

---

## 📋 Features Included
1. **Firebase Owner Login Page**:
   - Secure email and password authentication with Firebase
   - Show / Hide password toggle
   - Detailed error handling (invalid credentials, disabled accounts, rate limits)
   - Real-time session restoration without login screen flash

2. **Protected Owner Dashboard**:
   - 5 Core metric summary cards:
     - **New Enquiries**
     - **Pending Bookings**
     - **Confirmed Bookings**
     - **Cancelled Bookings**
     - **Upcoming Events**
   - Live Firestore collection sync (`"enquiries"`)
   - Venue overview & capacity reference (Main AC Hall, Dining Hall, Lawn, Parking)

3. **Navigation Sidebar**:
   - **Dashboard**
   - **Enquiries** (Real-time Firestore list, Manual Entry modal, search/filter, notes inspector, delete action)
   - **Bookings** (Pending, Confirmed, Cancelled tabs)
   - **Calendar** (Interactive month view & slot legend)
   - **Customers** (Customer directory shell)
   - **Settings** (Venue profile, slot timings, and live Firebase connection status)

4. **Security & Session Management**:
   - Auth Guard strictly prevents unauthorized access to the dashboard
   - Logout button in header and profile dropdown with Firebase `signOut`
