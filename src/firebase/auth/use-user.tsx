
'use client';
    
import { useState, useEffect } from 'react';
import { Auth, User as FirebaseAuthUser, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, Firestore } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import { useAuth, useFirestore } from '@/firebase/provider';
import { FirestorePermissionError } from '../errors';
import { errorEmitter } from '../error-emitter';

export interface UserHookResult {
  user: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/**
 * Hook specifically for accessing the authenticated user's state, including custom profile data.
 * This provides the full User object (from Firestore), loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  useEffect(() => {
    if (!auth || !firestore) {
      setIsUserLoading(false);
      return;
    }

    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (firebaseUser: FirebaseAuthUser | null) => {
        if (unsubscribeDoc) {
          unsubscribeDoc();
        }

        if (firebaseUser) {
          const userDocRef = doc(firestore, 'users', firebaseUser.uid);

          unsubscribeDoc = onSnapshot(
            userDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                setUser(docSnap.data() as AppUser);
              } else {
                setUser(null);
                const profileError = new Error("User is authenticated, but no user profile document was found in Firestore.");
                setUserError(profileError);
                console.warn("User document not found for UID:", firebaseUser.uid);
              }
              setIsUserLoading(false);
            },
            async (error) => {
              console.error("Error fetching user document:", error);
              const contextualError = await FirestorePermissionError.create({
                path: userDocRef.path,
                operation: 'get',
              });
              setUserError(contextualError);
              errorEmitter.emit('permission-error', contextualError);
              setIsUserLoading(false);
            }
          );
        } else {
          // User is signed out.
          setUser(null);
          setIsUserLoading(false);
          setUserError(null); // Explicitly clear any previous errors.
        }
      },
      (error) => {
        // This is for errors during the auth state observation itself.
        console.error("Firebase Auth state error:", error);
        setUserError(error);
        setIsUserLoading(false);
      }
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
    };
  }, [auth, firestore]);

  return { user, isUserLoading, userError };
};
