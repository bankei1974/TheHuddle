
import React from 'react';
import { useDocument } from '../hooks/useDocument';
import { useAuthContext } from '../context/AuthContext';

const StaffProfile = ({ db, staffId }) => {
    const { data: staffMember, loading } = useDocument(db, `users/${staffId}`);
    const { userProfile } = useAuthContext();
    const isManager = userProfile.role === 'Manager';

    if (loading) return <p>Loading...</p>;
    if (!staffMember) return <p>Staff member not found.</p>;

    return (
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
            <div className="flex items-center gap-4">
                {staffMember.profilePictureUrl && (
                    <img src={staffMember.profilePictureUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                )}
                <div>
                    <h2 className="text-2xl font-semibold">{staffMember.fullName}</h2>
                    <p className="text-gray-400">{staffMember.jobTitle}</p>
                </div>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p className="label-style">Email</p><p>{staffMember.email}</p></div>
                <div><p className="label-style">Predominant Unit</p><p>{staffMember.predominantUnit}</p></div>
                <div><p className="label-style">Standard Start Time</p><p>{staffMember.standardStartTime}</p></div>
                <div><p className="label-style">Standard End Time</p><p>{staffMember.standardEndTime}</p></div>
                <div><p className="label-style">Hire Date</p><p>{staffMember.hireDate}</p></div>
                <div><p className="label-style">Contact Info</p><p>{staffMember.contactInfo}</p></div>
                <div><p className="label-style">Role</p><p>{staffMember.role}</p></div>
                <div><p className="label-style">Staff Karma</p><p>{staffMember.staffKarma || 0}</p></div>
                <div><p className="label-style">Birthdate</p><p>{staffMember.birthdate}</p></div>
                <div><p className="label-style">Employee ID</p><p>{staffMember.employeeId}</p></div>
                <div><p className="label-style">COA Hire Date</p><p>{staffMember.coaHireDate}</p></div>
                {isManager && (
                    <>
                        <div><p className="label-style">BLS Expiration Date</p><p>{staffMember.blsExpirationDate}</p></div>
                        <div><p className="label-style">PALS Expiration Date</p><p>{staffMember.palsExpirationDate}</p></div>
                        <div><p className="label-style">License Type</p><p>{staffMember.licenseType}</p></div>
                        <div><p className="label-style">License Expiration Date</p><p>{staffMember.licenseExpirationDate}</p></div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StaffProfile;
