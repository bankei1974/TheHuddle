import React, { useState, useMemo } from 'react';
import { where } from 'firebase/firestore';
import { useCollection } from '../hooks/useCollection';
import StaffShiftDetailsModal from './StaffShiftDetailsModal';
import WorkloadRatingModal from './WorkloadRatingModal';
import { ChevronLeft, ChevronRight, Download, Users } from 'lucide-react';
import { generateIcsContent } from '../utils/calendarUtils';
import FindSwapModal from './FindSwapModal';
import WeeklyCheckinModal from './WeeklyCheckinModal';
import { useAuthContext } from '../context/AuthContext';
import { db } from '../firebase';


const NewStaffSchedulingPage = () => {
    const { userProfile: currentUserProfile } = useAuthContext();
    const [startDate, setStartDate] = useState(new Date());
    const [isShiftDetailsModalOpen, setIsShiftDetailsModalOpen] = useState(false);
    const [isWorkloadModalOpen, setIsWorkloadModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [isFindSwapModalOpen, setIsFindSwapModalOpen] = useState(false);
    const [isWeeklyCheckinModalOpen, setIsWeeklyCheckinModalOpen] = useState(false);

    const shiftsPath = `shifts`;
    const unitsPath = `units`;
    const statusesPath = `statuses`;

    const { data: myShifts } = useCollection(db, shiftsPath, currentUserProfile?.id ? [where("staffId", "==", currentUserProfile.id), where("published", "==", true)] : []);
    const { data: allShifts } = useCollection(db, shiftsPath, [where("published", "==", true)]);
    const { data: allStaff } = useCollection(db, 'users');
    const { data: openShifts } = useCollection(db, 'openShifts');
    const { data: units } = useCollection(db, unitsPath);
    const { data: statuses } = useCollection(db, statusesPath);
    const { data: jobTitles } = useCollection(db, `jobTitles`);

    const unitsMap = useMemo(() => {
        if (!units) return {};
        return units.reduce((acc, unit) => {
            acc[unit.id] = unit;
            return acc;
        }, {});
    }, [units]);

    const statusSymbols = useMemo(() => {
        if (!statuses) return {};
        return statuses.reduce((acc, status) => {
            if (status.name) {
                acc[status.name] = status.symbol || '';
            }
            return acc;
        }, {});
    }, [statuses]);

    const dates = Array.from({ length: 28 }, (_, i) => { const date = new Date(startDate); date.setDate(date.getDate() + i); return date; });
    const handleDateChange = (days) => setStartDate(prev => { const newDate = new Date(prev); newDate.setDate(newDate.getDate() + days); return newDate; });
    const handleShiftClick = (shift) => {
        const today = new Date().setHours(0,0,0,0);
        const shiftDate = new Date(shift.date).setHours(0,0,0,0);
        setSelectedShift(shift);

        // Check if it's the last shift of the week
        const weekStart = new Date(shift.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const shiftsInWeek = myShifts.filter(s => {
            const d = new Date(s.date);
            return d >= weekStart && d <= weekEnd;
        });

        const isLastShiftOfWeek = shiftsInWeek.every(s => new Date(s.date) <= new Date(shift.date));

        const isEligibleForSurvey = currentUserProfile?.jobTitle === 'Registered Nurse' || currentUserProfile?.jobTitle === 'LPN';

        if (shiftDate < today && isLastShiftOfWeek) {
            setIsWeeklyCheckinModalOpen(true);
        } else if (shiftDate < today && isEligibleForSurvey) {
            setIsWorkloadModalOpen(true);
        } else {
            setIsShiftDetailsModalOpen(true);
        }
    };

    const shiftsToDisplay = myShifts;

    const statusColors = { 'Productive': 'bg-green-700', 'PTO': 'bg-yellow-700', 'On Call': 'bg-blue-700', 'Non-Productive': 'bg-gray-700', 'FMLA': 'bg-purple-700', 'EIB': 'bg-gray-700', 'Call Out': 'bg-gray-700', 'Preferred Off': 'bg-gray-700', 'On Call 1': 'bg-gray-700', 'On Call 2': 'bg-gray-700', 'On Call 3': 'bg-gray-700', 'MRI Morning Call': 'bg-gray-700', 'MRI Evening Call': 'bg-gray-700', 'Bonus': 'bg-gray-700', 'Extra Work Day': 'bg-gray-700', 'Orientation': 'bg-gray-700', 'Late Stay 1': 'bg-gray-700', 'Late Stay 2': 'bg-gray-700', 'Requested off': 'bg-gray-700' };

    const getShiftDateObjects = (shift) => {
        let shiftStart = null;
        let shiftEnd = null;

        if (shift.shiftStartDateTime) {
            shiftStart = new Date(shift.shiftStartDateTime);
        } else if (shift.startTime?.seconds) {
            shiftStart = new Date(shift.startTime.seconds * 1000);
        }

        if (shift.shiftEndDateTime) {
            shiftEnd = new Date(shift.shiftEndDateTime);
        } else if (shift.endTime?.seconds) {
            shiftEnd = new Date(shift.endTime.seconds * 1000);
        }

        if (shiftStart && shiftEnd && !isNaN(shiftStart) && !isNaN(shiftEnd)) {
            return { shiftStart, shiftEnd };
        }

        return { shiftStart: null, shiftEnd: null };
    }

    const formatShiftTime = (shift) => {
        const { shiftStart, shiftEnd } = getShiftDateObjects(shift);

        if (shiftStart && shiftEnd) {
            const options = {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
                timeZone: 'America/Chicago',
            };
            const startTimeString = new Intl.DateTimeFormat('en-US', options).format(shiftStart);
            const endTimeString = new Intl.DateTimeFormat('en-US', options).format(shiftEnd);
            return `${startTimeString} - ${endTimeString}`;
        }

        return 'Invalid time';
    }

    const handleDownloadCalendar = () => {
        if (!myShifts || myShifts.length === 0) {
            alert("No shifts to download.");
            return;
        }
        const icsContent = generateIcsContent(myShifts, unitsMap, statusSymbols);
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my_shifts_${new Date().getFullYear()}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
                        <button onClick={handleDownloadCalendar} className="btn-primary flex items-center gap-2"><Download size={18}/> Download Calendar</button>
                        <button onClick={() => setIsFindSwapModalOpen(true)} className="btn-secondary flex items-center gap-2"><Users size={18}/> Find a Swap</button>
                    </div>
                </div>

                

                <div className="grid grid-cols-7 gap-px bg-gray-700 border border-gray-700 rounded-lg overflow-hidden h-full overflow-y-auto">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-center font-semibold py-2 bg-gray-800">{day}</div>)}
                    {dates.map(date => {
                        const dateString = date.toISOString().split('T')[0];
                        const shiftsForDay = shiftsToDisplay && shiftsToDisplay.filter(s => {
                            const shiftDate = s.date || new Date(s.startTime.seconds * 1000).toISOString().split('T')[0];
                            return shiftDate === dateString;
                        });
                        return (
                            <div key={dateString} className="p-2 bg-gray-800/50 border-t border-gray-700">
                                <span className="font-semibold">{date.getDate()}</span>
                                <div className="mt-1 space-y-1">
                                    {shiftsForDay && shiftsForDay.map(shift => (
                                        <div
                                            key={shift.id}
                                            onClick={() => handleShiftClick(shift)}
                                            className={`p-2 rounded-lg text-white cursor-pointer ${unitsMap[shift.unitId]?.color || 'bg-gray-600'} `}
                                            title={Array.isArray(shift.status) ? shift.status.join(', ') : shift.status}
                                        >
                                            <div className="flex justify-between items-center">
                                                <p className="font-bold text-sm">{unitsMap[shift.unitId]?.name || shift.unitId}</p>
                                                <div className="flex gap-1">
                                                    {Array.isArray(shift.status) && shift.status.map(s => <span key={s} className="text-xl text-white text-shadow-default">{statusSymbols[s] || '❓'}</span>)}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs">{formatShiftTime(shift)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
            <StaffShiftDetailsModal isOpen={isShiftDetailsModalOpen} onClose={() => setIsShiftDetailsModalOpen(false)} shift={selectedShift} allShifts={allShifts} allStaff={allStaff} currentUserId={currentUserProfile?.id} db={db} collectionPath={shiftsPath} unitsMap={unitsMap} />
            <WorkloadRatingModal isOpen={isWorkloadModalOpen} onClose={() => setIsWorkloadModalOpen(false)} shift={selectedShift} collectionPath={shiftsPath} />
            <FindSwapModal
                isOpen={isFindSwapModalOpen}
                onClose={() => setIsFindSwapModalOpen(false)}
                shifts={myShifts}
                units={units}
                jobTitles={jobTitles}
                statuses={statuses}
            />
            <WeeklyCheckinModal
                isOpen={isWeeklyCheckinModalOpen}
                onClose={() => setIsWeeklyCheckinModalOpen(false)}
                userProfile={currentUserProfile}
            />
        </>
    );
}

export default NewStaffSchedulingPage;