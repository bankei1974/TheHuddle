import { formatDateInCentralTime } from '../utils/timezoneHelpers';
import { where } from 'firebase/firestore';
import { useCollection } from '../hooks/useCollection';
import StaffShiftDetailsModal from './StaffShiftDetailsModal';
import WorkloadRatingModal from './WorkloadRatingModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';

const StaffSchedulingPage = ({ db, currentUserProfile }) => {
    const [startDate, setStartDate] = useState(new Date());
    const [isShiftDetailsModalOpen, setIsShiftDetailsModalOpen] = useState(false);
    const [isWorkloadModalOpen, setIsWorkloadModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [selectedUnits, setSelectedUnits] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);

    const shiftsPath = `shifts`;
    const usersPath = `users`;
    const unitsPath = `units`;
    const jobTitlesPath = `jobTitles`;

    const { data: myShifts } = useCollection(db, shiftsPath, currentUserProfile?.id ? [where("staffId", "==", currentUserProfile.id), where("published", "==", true)] : []);
    const { data: allShifts } = useCollection(db, shiftsPath);
    const { data: allStaff } = useCollection(db, usersPath);
    const { data: units } = useCollection(db, unitsPath);
    const { data: jobTitles } = useCollection(db, jobTitlesPath);

    const unitsMap = useMemo(() => {
        return units.reduce((acc, unit) => {
            acc[unit.id] = unit;
            return acc;
        }, {});
    }, [units]);

    const filteredShifts = useMemo(() => {
        let currentShifts = myShifts;

        if (selectedUnits.length > 0) {
            currentShifts = currentShifts.filter(shift => selectedUnits.includes(shift.unit));
        }

        if (selectedRoles.length > 0) {
            currentShifts = currentShifts.filter(shift => {
                const staffMember = allStaff.find(staff => staff.id === shift.staffId);
                return staffMember && selectedRoles.includes(staffMember.jobTitle);
            });
        }

        return currentShifts;
    }, [myShifts, selectedUnits, selectedRoles, allStaff]);
    const statusColors = { 'Productive': 'bg-green-700', 'PTO': 'bg-yellow-700', 'On Call': 'bg-blue-700', 'Non-Productive': 'bg-gray-700', 'FMLA': 'bg-purple-700', 'EIB': 'bg-gray-700', 'Call Out': 'bg-gray-700', 'Preferred Off': 'bg-gray-700', 'On Call 1': 'bg-gray-700', 'On Call 2': 'bg-gray-700', 'On Call 3': 'bg-gray-700', 'MRI Morning Call': 'bg-gray-700', 'MRI Evening Call': 'bg-gray-700', 'Bonus': 'bg-gray-700', 'Extra Work Day': 'bg-gray-700', 'Orientation': 'bg-gray-700', 'Late Stay 1': 'bg-gray-700', 'Late Stay 2': 'bg-gray-700', 'Requested off': 'bg-gray-700' };
    const statusSymbols = { 'Productive': '✅', 'PTO': '🏖️', 'On Call': '📞', 'Non-Productive': '❌', 'FMLA': '🏥', 'EIB': '💰', 'Call Out': '🚨', 'Preferred Off': '❤️', 'On Call 1': '1️⃣', 'On Call 2': '2️⃣', 'On Call 3': '3️⃣', 'MRI Morning Call': '🌅', 'MRI Evening Call': '🌃', 'Bonus': '⭐', 'Extra Work Day': '➕', 'Orientation': '📚', 'Late Stay 1': '🌙', 'Late Stay 2': '🦉', 'Requested off': '📝' };
    const dates = Array.from({ length: 28 }, (_, i) => { const date = new Date(startDate); date.setDate(date.getDate() + i); return date; });
    const handleDateChange = (days) => setStartDate(prev => { const newDate = new Date(prev); newDate.setDate(newDate.getDate() + days); return newDate; });
    const handleShiftClick = (shift) => {
        const today = new Date().setHours(0,0,0,0);
        const shiftDate = new Date(shift.date).setHours(0,0,0,0);
        setSelectedShift(shift);
        if (shiftDate < today) {
            setIsWorkloadModalOpen(true);
        } else {
            setIsShiftDetailsModalOpen(true);
        }
    };

    return (
        <>
            <main className="p-8 overflow-y-auto flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-white">My Schedule</h1>
                    <div className="flex items-center gap-4">
                        <button onClick={() => handleDateChange(-7)} className="p-2 rounded-md bg-gray-700 hover:bg-gray-600"><ChevronLeft/></button>
                        <span className="text-xl font-semibold">{dates[0].toLocaleDateString()} - {dates[27].toLocaleDateString()}</span>
                        <button onClick={() => handleDateChange(7)} className="p-2 rounded-md bg-gray-700 hover:bg-gray-600"><ChevronRight/></button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 mb-4 relative">
                    {/* Filters Section */}
                    <div className="flex flex-wrap gap-4">
                        {/* Unit Filter */}
                        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                            <h3 className="text-lg font-semibold text-white mb-2">Filter by Unit</h3>
                            <div className="flex flex-wrap gap-2">
                                {units.map(unit => (
                                    <label key={unit.id} className="flex items-center gap-1 text-white text-sm">
                                        <input
                                            type="checkbox"
                                            value={unit.name}
                                            checked={selectedUnits.includes(unit.name)}
                                            onChange={(e) => {
                                                const { value, checked } = e.target;
                                                setSelectedUnits(prev =>
                                                    checked ? [...prev, value] : prev.filter(u => u !== value)
                                                );
                                            }}
                                            className="h-4 w-4 rounded"
                                        />
                                        {unit.name}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Role Filter */}
                        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                            <h3 className="text-lg font-semibold text-white mb-2">Filter by Role</h3>
                            <div className="flex flex-wrap gap-2">
                                {jobTitles.map(role => (
                                    <label key={role.id} className="flex items-center gap-1 text-white text-sm">
                                        <input
                                            type="checkbox"
                                            value={role.name}
                                            checked={selectedRoles.includes(role.name)}
                                            onChange={(e) => {
                                                const { value, checked } = e.target;
                                                setSelectedRoles(prev =>
                                                    checked ? [...prev, value] : prev.filter(r => r !== value)
                                                );
                                            }}
                                            className="h-4 w-4 rounded"
                                        />
                                        {role.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-px bg-gray-700 border border-gray-700 rounded-lg overflow-hidden">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-center font-semibold py-2 bg-gray-800">{day}</div>)}
                    {dates.map(date => {
                        const dateString = formatDateInCentralTime(date);
                        const shiftsForDay = filteredShifts.filter(s => s.date === dateString);
                        return (
                            <div key={dateString} className="p-2 h-40 bg-gray-800/50 border-t border-gray-700">
                                <span className="font-semibold">{date.getDate()}</span>
                                <div className="mt-1 space-y-1">
                                    {shiftsForDay.map(shift => (
                                        <div
                                            key={shift.id}
                                            onClick={() => handleShiftClick(shift)}
                                            className={`p-2 rounded-lg text-white cursor-pointer ${Array.isArray(shift.status) ? (shift.status.includes('Productive') ? statusColors['Productive'] : statusColors[shift.status[0]]) : statusColors[shift.status] || 'bg-gray-600'} `}
                                            title={Array.isArray(shift.status) ? shift.status.join(', ') : shift.status}
                                        >
                                            <p className="font-bold text-sm">{shift.unit}</p>
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs">{shift.startTime} - {shift.endTime}</p>
                                                <div className="flex gap-1">
                                                    {Array.isArray(shift.status) && shift.status.map(s => statusSymbols[s] && <span key={s} className="text-xl text-white">{statusSymbols[s]}</span>)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
            <StaffShiftDetailsModal isOpen={isShiftDetailsModalOpen} onClose={() => setIsShiftDetailsModalOpen(false)} shift={selectedShift} allShifts={allShifts} allStaff={allStaff} currentUserId={currentUserProfile.id} unitsMap={unitsMap}/>
            <WorkloadRatingModal isOpen={isWorkloadModalOpen} onClose={() => setIsWorkloadModalOpen(false)} db={db} shift={selectedShift} collectionPath={shiftsPath} />
        </>
    );
}

export default StaffSchedulingPage;