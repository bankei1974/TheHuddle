import React, { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import StaffShiftDetailsModal from './StaffShiftDetailsModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, isSameMonth, startOfMonth, getDay, getDaysInMonth } from 'date-fns';
import OpenShiftFormModal from './OpenShiftFormModal';
import { doc, updateDoc } from 'firebase/firestore';

import { db } from '../firebase';
import { useAuthContext } from '../context/AuthContext';

const HelpOutHubPage = () => {
    const { user: currentUser, userProfile } = useAuthContext();
    const [startDate, setStartDate] = useState(new Date());
    const [isShiftDetailsModalOpen, setIsShiftDetailsModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [isOpenShiftFormModalOpen, setIsOpenShiftFormModalOpen] = useState(false);
    const [selectedDateForModal, setSelectedDateForModal] = useState(null);

    const { data: openShifts = [] } = useCollection(db, 'openShifts');
    const { data: units = [] } = useCollection(db, 'units');
    const { data: statuses = [] } = useCollection(db, 'statuses');
    const { data: jobTitles = [] } = useCollection(db, `jobTitles`);

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

    const firstDayOfMonth = startOfMonth(startDate);
    const startingDayOfWeek = getDay(firstDayOfMonth);
    const daysInMonth = getDaysInMonth(startDate);
    const dates = Array.from({ length: daysInMonth }, (_, i) => { const date = new Date(firstDayOfMonth); date.setDate(date.getDate() + i); return date; });
    const handleDateChange = (months) => setStartDate(prev => addMonths(prev, months));

    const handleShiftClick = (e, shift) => {
        e.stopPropagation(); // Prevent the click from bubbling up to the day div
        setSelectedShift(shift);
        setIsShiftDetailsModalOpen(true);
        console.log("Sign up for open shift:", shift);
    };

    const handleClaimShift = async (shiftId) => {
        try {
            const shiftRef = doc(db, 'openShifts', shiftId);
            await updateDoc(shiftRef, {
                claimStatus: 'pending',
                claimedBy: currentUser.uid,
                claimedByName: userProfile.fullName, // Store claimant's name for easier display
            });
            alert('Shift claimed successfully! Waiting for manager approval.');
        } catch (error) {
            console.error("Error claiming shift:", error);
            alert('Failed to claim shift. Please try again.');
        }
    };

    return (
        <>
            <main className="p-8 overflow-y-auto flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-white">Help Out Hub</h1>
                    <div className="flex items-center gap-4">
                        <button onClick={() => handleDateChange(-1)} className="p-2 rounded-md bg-gray-700 hover:bg-gray-600"><ChevronLeft/></button>
                        <span className="text-xl font-semibold">{format(startDate, 'MMMM yyyy')}</span>
                        <button onClick={() => handleDateChange(1)} className="p-2 rounded-md bg-gray-700 hover:bg-gray-600"><ChevronRight/></button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-px bg-gray-700 border border-gray-700 rounded-lg overflow-hidden h-full overflow-y-auto">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-center font-semibold py-2 bg-gray-800">{day}</div>)}
                    {Array.from({ length: startingDayOfWeek }).map((_, i) => <div key={`empty-${i}`} className="bg-gray-800/50 border-t border-gray-700"></div>)}
                    {dates.map(date => {
                        const dateString = date.toISOString().split('T')[0];
                        const shiftsForDay = openShifts.filter(s => {
                            const shiftDate = s.date || new Date(s.startTime.seconds * 1000).toISOString().split('T')[0];
                            return shiftDate === dateString;
                        });
                        return (
                            <div
                                key={dateString}
                                className="p-2 bg-gray-800/50 border-t border-gray-700 cursor-pointer hover:bg-gray-700"
                                onClick={() => {
                                    setSelectedDateForModal(date);
                                    setIsOpenShiftFormModalOpen(true);
                                }}
                            >
                                <span className="font-semibold">{date.getDate()}</span>
                                <div className="mt-1 space-y-1">
                                    {shiftsForDay.map(shift => (
                                        <div
                                            key={shift.id}
                                            className={`p-2 rounded-lg text-white cursor-pointer ${unitsMap[shift.unitId]?.color || 'bg-gray-600'} `}
                                            title={shift.status?.join(', ') || ''}
                                        >
                                            <div className="flex justify-between items-center">
                                                <p className="font-bold text-sm">{unitsMap[shift.unitId]?.name || shift.unitId}</p>
                                                <div className="flex gap-1">
                                                    {shift.status && shift.status.map(s => <span key={s} className="text-xl text-white text-shadow-default">{statusSymbols[s] || '❓'}</span>)}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs">{new Date(shift.startTime.seconds * 1000).toLocaleTimeString()} - {new Date(shift.endTime.seconds * 1000).toLocaleTimeString()}</p>
                                            </div>
                                            {shift.claimStatus === 'pending' ? (
                                                <p className="text-sm mt-2">Claimed by {shift.claimedByName} (Pending)</p>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleClaimShift(shift.id); }}
                                                    className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
                                                >
                                                    Claim Shift
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
            <StaffShiftDetailsModal isOpen={isShiftDetailsModalOpen} onClose={() => setIsShiftDetailsModalOpen(false)} shift={selectedShift} db={db} collectionPath="openShifts" unitsMap={unitsMap} />
            <OpenShiftFormModal
                isOpen={isOpenShiftFormModalOpen}
                onClose={() => setIsOpenShiftFormModalOpen(false)}
                db={db}
                units={units}
                jobTitles={jobTitles}
                selectedDate={selectedDateForModal}
                statuses={statuses}
            />
        </>
    );
}

export default HelpOutHubPage;