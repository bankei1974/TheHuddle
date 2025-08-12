import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

export function useCollection(db, collectionPath, queryConstraints = [], orderByConstraints = []) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refetchIndex, setRefetchIndex] = useState(0);

    const refetch = () => setRefetchIndex(prev => prev + 1);

    useEffect(() => {
        if (!db || !collectionPath) { setLoading(false); return; };
        
        const hasUndefined = queryConstraints.some(c => c && typeof c._where === 'object' && c._where.value === undefined);
        if (hasUndefined) {
            setLoading(false);
            setData([]);
            return;
        }

        setLoading(true);
        const collRef = collection(db, collectionPath);
        
        const finalQueryConstraints = [...queryConstraints];
        if (Array.isArray(orderByConstraints) && orderByConstraints.length > 0) {
            orderByConstraints.forEach(ob => finalQueryConstraints.push(orderBy(ob.field, ob.direction)));
        }

        const q = query(collRef, ...finalQueryConstraints);
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const items = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    status: Array.isArray(data.status) ? data.status : []
                };
            });
            setData(items);
            setLoading(false);
        }, (error) => {
            console.error(`Error fetching collection (${collectionPath}):`, error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, collectionPath, JSON.stringify(queryConstraints), JSON.stringify(orderByConstraints), refetchIndex]);

    return { data, loading, refetch };
}