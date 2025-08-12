import React from 'react';
import { useCollection } from '../hooks/useCollection';
import { db } from '../firebase';
import { where } from 'firebase/firestore';

const KarmaLeaderboard = ({ selectedUnits }) => {
    const query = selectedUnits.length > 0 ? [where('predominantUnitId', 'in', selectedUnits)] : [];
    const { data: staff } = useCollection(db, 'users', query);

    const sortedStaff = staff.sort((a, b) => (b.staffKarma || 0) - (a.staffKarma || 0)).slice(0, 5);

    return (
        <div className="bg-gray-800 p-0.5 rounded-lg h-full">
            <h3 className="text-sm font-semibold mb-0.5">Top 5 Karma</h3>
            <ol className="list-decimal list-inside space-y-0.5 text-xs">
                {sortedStaff.map((member, index) => (
                    <li key={member.id} className="flex justify-between items-center bg-gray-700/50 p-0 rounded-md">
                        <span>{index + 1}. {member.fullName}</span>
                        <span className="font-bold">{member.staffKarma || 0}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
};

export default KarmaLeaderboard;
