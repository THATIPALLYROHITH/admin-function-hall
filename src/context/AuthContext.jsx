import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Monitor Firebase Auth state change for automatic session persistence
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            setCurrentUser({
              uid: user.uid,
              email: user.email,
              role: 'Administrator / Owner',
              venueName: 'VLNS Gardens',
              loginTime: new Date().toISOString()
            });
          } else {
            setCurrentUser(null);
          }
          setIsAuthLoading(false);
        },
        (error) => {
          console.error('Firebase Auth state error:', error);
          setIsAuthLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  // Firebase Email/Password Sign-In
  const login = async (email, password) => {
    setIsAuthenticating(true);
    setAuthError('');

    if (!isFirebaseConfigured || !auth) {
      setIsAuthenticating(false);
      const errMsg = 'Firebase is not connected. Please add your Firebase project credentials to .env to sign in.';
      setAuthError(errMsg);
      return { success: false, error: errMsg };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      const adminUser = {
        uid: user.uid,
        email: user.email,
        role: 'Administrator / Owner',
        venueName: 'VLNS Gardens',
        loginTime: new Date().toISOString()
      };

      setCurrentUser(adminUser);
      setIsAuthenticating(false);
      return { success: true, user: adminUser };
    } catch (error) {
      setIsAuthenticating(false);
      let message = 'Failed to authenticate. Please check your credentials.';

      switch (error.code) {
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Invalid email or password. Please verify your credentials.';
          break;
        case 'auth/too-many-requests':
          message = 'Account temporarily locked due to too many failed attempts. Please try again later.';
          break;
        case 'auth/user-disabled':
          message = 'This administrator account has been disabled.';
          break;
        case 'auth/network-request-failed':
          message = 'Network connection failed. Please check your internet connection.';
          break;
        default:
          message = error.message || 'Authentication error occurred.';
      }

      setAuthError(message);
      return { success: false, error: message };
    }
  };

  // Sign out from Firebase
  const logout = async () => {
    setAuthError('');
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Firebase SignOut error:', err);
      }
    }
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isAuthLoading,
    login,
    logout,
    authError,
    setAuthError,
    isAuthenticating,
    isFirebaseConfigured
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
