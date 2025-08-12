import { useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import {
    doc,
    setDoc,
    onSnapshot,
    serverTimestamp,
    query,
    where,
    collection,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function useAuth() {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where("email", "==", currentUser.email));

                const unsubscribeProfile = onSnapshot(q, (snapshot) => {
                    if (snapshot.empty) {
                        // User profile doesn't exist yet. This is fine.
                        // It will be created by StaffFormModal.
                        setUserProfile(null);
                        setIsLoading(false);
                    } else {
                        const profileDoc = snapshot.docs[0];
                        setUserProfile({ id: profileDoc.id, ...profileDoc.data() });
                        setIsLoading(false);
                    }
                });
                return () => unsubscribeProfile();
            } else {
                setUser(null);
                setUserProfile(null);
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        setError(null);
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
                setError('Invalid email or password.');
            } else {
                console.error("Login error:", err);
                setError('An unexpected error occurred during login.');
            }
        } finally {
            // Loading state is managed by onAuthStateChanged listener
        }
    };

    const signup = async (email, password) => {
        setError(null);
        setIsLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
            console.error("Signup error:", err);
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already in use.');
            } else {
                setError('An unexpected error occurred during sign-up.');
            }
        } finally {
            // Loading state is managed by onAuthStateChanged listener
        }
    };

    const logout = async () => {
        setError(null);
        try {
            await signOut(auth);
        } catch (err) {
            console.error("Logout error:", err);
            setError('Failed to log out.');
        }
    };

    return { user, userProfile, isLoading, error, login, signup, logout };
}
