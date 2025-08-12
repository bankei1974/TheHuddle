import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import Modal from './Modal';

const FindSwapModal = ({ isOpen, onClose, db, currentUserProfile, shifts, units, jobTitles }) => {
    const [selectedDate, setSelectedDate] = useState('');
    const [availableStaff, setAvailableStaff] = useState([]);

    const nonProductiveStatuses = useMemo(() => [
        'PTO', 'EIB', 'Call Out', 'Orientation', 'Preferred Off', 'FMLA', 'Non-Productive'
    ], []);

    const jobTitleGroups = useMemo(() => {
        const groups = {};
        jobTitles.forEach(jt => {
            if (jt.name === 'LPN' || jt.name === 'Registered Nurse') {
                if (!groups['Nursing']) groups['Nursing'] = [];
                groups['Nursing'].push(jt.name);
            } else {
                if (!groups[jt.name]) groups[jt.name] = [];
                groups[jt.name].push(jt.name);
            }
        });
        return groups;
    }, [jobTitles]);

    const getJobTitleGroup = useCallback((jobTitle) => {
        for (const groupName in jobTitleGroups) {
            if (jobTitleGroups[groupName].includes(jobTitle)) {
                return groupName;
            }
        }
        return jobTitle; // Return original if no group found
    }, [jobTitleGroups]);

    useEffect(() => {
        if (!isOpen || !selectedDate || !currentUserProfile || !shifts || !units || !jobTitles) {
            setAvailableStaff([]);
            return;
        }

        const findAvailableStaff = async () => {
            const selectedDateString = selectedDate;
            const currentStaffUnitId = currentUserProfile.predominantUnit;
            const currentStaffJobTitleGroup = getJobTitleGroup(currentUserProfile.jobTitle);

            // Fetch all users (staff)
            const usersCollectionRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCollectionRef);
            const allStaff = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const filtered = allStaff.filter(staff => {
                // 1. Same predominant unit
                if (staff.predominantUnit !== currentStaffUnitId) {
                    return false;
                }

                // 2. Same job title group
                if (getJobTitleGroup(staff.jobTitle) !== currentStaffJobTitleGroup) {
                    return false;
                }

                // 3. Check if scheduled or has non-productive status on selectedDate
                const staffShiftsOnSelectedDate = shifts.filter(s => s.staffId === staff.id && s.date === selectedDateString);

                if (staffShiftsOnSelectedDate.length > 0) {
                    // Check for non-productive statuses
                    const hasNonProductiveStatus = staffShiftsOnSelectedDate.some(shift =>
                        Array.isArray(shift.status) && shift.status.some(status => nonProductiveStatuses.includes(status))
                    );
                    if (hasNonProductiveStatus) {
                        return false;
                    }
                    // If they have a shift but it's productive, they are not available for a swap
                    return false;
                }

                return true; // Staff is available
            });
            setAvailableStaff(filtered);
        };

        findAvailableStaff();
    }, [isOpen, selectedDate, currentUserProfile, shifts, units, jobTitles, nonProductiveStatuses, getJobTitleGroup, db]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Find a Swap">
            <div className="space-y-4">
                <div>
                    <label className="label-style">Select Date for Swap</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="input-style"
                    />
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2">Available Staff:</h3>
                    {availableStaff.length === 0 && selectedDate ? (
                        <p>No staff available for swap on this date.</p>
                    ) : availableStaff.length === 0 && !selectedDate ? (
                        <p>Select a date to find available staff.</p>
                    ) : (
                        <ul className="space-y-2 max-h-60 overflow-y-auto">
                            {availableStaff.map(staff => (
                                <li key={staff.id} className="bg-gray-700/50 p-2 rounded-md flex justify-between items-center">
                                    <span>{staff.fullName} ({staff.jobTitle})</span>
                                    <button onClick={() => window.location.href = `mailto:${staff.email}`} className="btn-secondary">Contact</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default FindSwapModal;
