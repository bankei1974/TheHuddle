import React from 'react';
import StaffManagement from './StaffManagement';

import { db } from '../firebase';

const StaffManagementPage = ({ onViewProfile }) => {
    return (
        <main className="p-8 overflow-y-auto">
            <h1 className="text-4xl font-bold text-white mb-8">Staff Management</h1>
            <StaffManagement db={db} onViewProfile={onViewProfile} />
        </main>
    );
};

export default StaffManagementPage;
