
import React from 'react';
import { useParams } from 'react-router-dom';
import StaffProfile from './StaffProfile';

import { db } from '../firebase';

const StaffProfilePage = () => {
    const { staffId } = useParams();
    return (
        <div className="p-6">
            <StaffProfile db={db} staffId={staffId} />
        </div>
    );
};

export default StaffProfilePage;
