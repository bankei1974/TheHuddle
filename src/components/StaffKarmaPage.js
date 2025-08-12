import React from 'react';
import { useCollection } from '../hooks/useCollection';
import { where } from 'firebase/firestore';

import { db } from '../firebase';
import { useAuthContext } from '../context/AuthContext';

const StaffKarmaPage = () => {
    const { userProfile: currentUserProfile } = useAuthContext();
    const { data: karmaTransactions, loading: karmaLoading } = useCollection(db, 'karmaTransactions', currentUserProfile?.id ? [where("staffId", "==", currentUserProfile.id)] : [], [{ field: "timestamp", direction: "desc" }]);

    return (
        <main className="p-8 overflow-y-auto flex-1 flex flex-col">
            <h1 className="text-4xl font-bold text-white mb-8">My Staff Karma</h1>

            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 mb-8">
                <h2 className="text-2xl font-semibold mb-4">Current Staff Karma: {currentUserProfile?.staffKarma || 0}</h2>
                <h3 className="text-xl font-semibold mb-2">Karma Transaction History</h3>
                {karmaLoading ? (
                    <p>Loading karma history...</p>
                ) : karmaTransactions.length === 0 ? (
                    <p className="text-gray-400">No karma transactions yet.</p>
                ) : (
                    <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {karmaTransactions.map(transaction => (
                            <li key={transaction.id} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
                                <span>{new Date(transaction.timestamp?.toDate()).toLocaleString()}: {transaction.reason}</span>
                                <span className={`font-bold ${transaction.karmaChange > 0 ? 'text-green-400' : 'text-red-400'}`}>{transaction.karmaChange} Karma</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </main>
    );
};

export default StaffKarmaPage;