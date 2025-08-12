
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';

export function useDocument(db, docPath) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db || !docPath) { setLoading(false); return; };
        setLoading(true);
        const docRef = doc(db, docPath);
        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                setData({ id: doc.id, ...doc.data() });
            } else {
                setData(null);
            }
            setLoading(false);
        }, (error) => { console.error(`Error fetching document (${docPath}):`, error); setLoading(false); });
        return () => unsubscribe();
    }, [db, docPath]);

    return { data, loading };
}
