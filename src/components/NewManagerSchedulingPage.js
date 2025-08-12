import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCollection } from '../hooks/useCollection';
import ShiftModal from './ShiftModal';
import PublishModal from './PublishModal';
import ApplyTemplateModal from './ApplyTemplateModal';
import RotationTemplatesModal from './RotationTemplatesModal';
import { Search, ChevronLeft, ChevronRight, Send, FilePlus, User, ArrowUp, ArrowDown, ClipboardList } from 'lucide-react';
import { where, doc, updateDoc, addDoc, deleteDoc, deleteField, collection, writeBatch, orderBy } from 'firebase/firestore';
import TodaysView from './TodaysView';

import { db } from '../firebase';

const NewManagerSchedulingPage = ({ onViewProfile }) => {
    const [startDate, setStartDate] = useState(new Date());
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [selectedShiftInfo, setSelectedShiftInfo] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showTodaysView, setShowTodaysView] = useState(false);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [isApplyTemplateModalOpen, setIsApplyTemplateModalOpen] = useState(false);
    const [selectedStaffForTemplate, setSelectedStaffForTemplate] = useState(null);
    const [isRotationTemplatesModalOpen, setIsRotationTemplatesModalOpen] = useState(false);
    const [selectedStaffForTemplates, setSelectedStaffForTemplates] = useState(null);
    const [tooltip, setTooltip] = useState({ visible: false, content: null, x: 0, y: 0 });
    const [selectedUnits, setSelectedUnits] = useState([]);
    const [selectedJobTitles, setSelectedJobTitles] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [isUnitFilterExpanded, setIsUnitFilterExpanded] = useState(false);
    const [isJobTitleFilterExpanded, setIsJobTitleFilterExpanded] = useState(false);
    const [isStatusFilterExpanded, setIsStatusFilterExpanded] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isPendingShiftsExpanded, setIsPendingShiftsExpanded] = useState(true);

    const handleDateChange = (e) => {
        setSelectedDate(new Date(e.target.value));
    };

    const usersPath = `users`;
    const shiftsPath = `shifts`;
    const unitsPath = `units`;
    const jobTitlesPath = `jobTitles`;
    const statusesPath = `statuses`;

    const { data: fetchedStaffList, loading: staffLoading, refetch: refetchStaff } = useCollection(db, usersPath, [], [{ field: 'displayOrder', direction: 'asc' }]);
    const [staffData, setStaffData] = useState([]);

    useEffect(() => {
        if (fetchedStaffList) {
            setStaffData(fetchedStaffList);
        }
    }, [fetchedStaffList]);
    const { data: shifts } = useCollection(db, shiftsPath, [], [{ field: 'date', direction: 'asc' }, { field: 'shiftStartDateTime', direction: 'asc' }]);
    const { data: openShifts = [] } = useCollection(db, 'openShifts');

    const pendingShifts = useMemo(() => {
        return openShifts.filter(shift => shift.claimStatus === 'pending');
    }, [openShifts]);

    const handleApproveShift = async (shift) => {
        if (!window.confirm(`Are you sure you want to approve this shift for ${shift.claimedByName}?`)) {
            return;
        }
        try {
            const { claimedBy, claimedByName, startTime, endTime, ...restOfShiftData } = shift;

            const newShiftData = {
                ...restOfShiftData,
                staffId: claimedBy,
                claimStatus: 'approved',
                shiftStartDateTime: startTime.toDate().toISOString(),
                shiftEndDateTime: endTime.toDate().toISOString(),
            };

            await addDoc(collection(db, 'shifts'), newShiftData);
            await deleteDoc(doc(db, 'openShifts', shift.id));

            alert('Shift approved and moved to staff schedule!');
        } catch (error) {
            console.error("Error approving shift:", error);
            alert('Failed to approve shift. Please try again.');
        }
    };

    const handleRejectShift = async (shift) => {
        if (!window.confirm(`Are you sure you want to reject this shift for ${shift.claimedByName}?`)) {
            return;
        }
        try {
            const shiftRef = doc(db, 'openShifts', shift.id);
            await updateDoc(shiftRef, {
                claimStatus: 'open',
                claimedBy: deleteField(),
                claimedByName: deleteField(),
            });
            alert('Shift rejected and returned to open shifts.');
        } catch (error) {
            console.error("Error rejecting shift:", error);
            alert('Failed to reject shift. Please try again.');
        }
    };
    const { data: units } = useCollection(db, unitsPath);
    const { data: jobTitles } = useCollection(db, jobTitlesPath);
    const { data: statuses } = useCollection(db, statusesPath);

    const { data: staffingLevels } = useCollection(db, 'staffingLevels', [
        where('date', '<=', selectedDate.toISOString().split('T')[0])
    ], [{ field: "date", direction: "desc" }]);

    const unitsMap = useMemo(() => {
        if (!units) return {};
        return units.reduce((acc, unit) => {
            acc[unit.id] = unit;
            return acc;
        }, {});
    }, [units]);
    
    

    const filteredStaff = useMemo(() => {
        let currentStaff = [...staffData];

        if (searchQuery) {
            currentStaff = currentStaff.filter(s => s.fullName && s.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        // Only filter by job title if a job title is selected
        if (selectedJobTitles.length > 0) {
            currentStaff = currentStaff.filter(staff => selectedJobTitles.includes(staff.jobTitle));
        }

        return currentStaff;
    }, [staffData, searchQuery, selectedJobTitles]);

    const filteredShifts = useMemo(() => {
        if (!shifts) return [];
        let currentShifts = [...shifts];

        // Filter shifts based on selected units
        if (selectedUnits.length > 0) {
            currentShifts = currentShifts.filter(shift => selectedUnits.includes(unitsMap[shift.unitId]?.name));
        }

        // Filter shifts based on selected statuses
        if (selectedStatuses.length > 0) {
            currentShifts = currentShifts.filter(shift =>
                shift.status && Array.isArray(shift.status) && shift.status.some(s => selectedStatuses.includes(s))
            );
        }

        return currentShifts;
    }, [shifts, selectedUnits, selectedStatuses, unitsMap]);

    const todaysViewShifts = useMemo(() => {
        if (!shifts) return [];
        let currentShifts = [...shifts];

        if (selectedUnits.length > 0) {
            currentShifts = currentShifts.filter(shift => selectedUnits.includes(unitsMap[shift.unitId]?.name));
        }

        const staffIds = filteredStaff.map(staff => staff.id);
        currentShifts = currentShifts.filter(shift => staffIds.includes(shift.staffId));

        return currentShifts;
    }, [shifts, selectedUnits, filteredStaff, unitsMap]);
    
    const dates = Array.from({ length: 28 }, (_, i) => { const date = new Date(startDate); date.setDate(date.getDate() + i); return date; });
    const handleWeekChange = (days) => setStartDate(prev => { const newDate = new Date(prev); newDate.setDate(newDate.getDate() + days); return newDate; });
    const handleOpenShiftModal = (staff, date, shift = null) => { setSelectedShiftInfo({ staff, date, shift }); setIsShiftModalOpen(true); };

    const handleOpenShiftClick = (shift) => {
        // This is where you'd implement the logic for a manager clicking an open shift
        // For example, opening a modal to approve/deny the shift, or reassign it.
        console.log("Manager clicked open shift:", shift);
        // You might want to open a specific modal for open shifts here
        // For now, we'll just log it.
    };
    const handleOpenApplyTemplateModal = (staff) => { setSelectedStaffForTemplate(staff); setIsApplyTemplateModalOpen(true); };

    const handleReorder = async (index, direction) => {
        const newStaffData = [...staffData];
        const [movedStaff] = newStaffData.splice(index, 1);
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        newStaffData.splice(newIndex, 0, movedStaff);

        const batch = writeBatch(db);
        newStaffData.forEach((staff, i) => {
            const staffRef = doc(db, 'users', staff.id);
            batch.update(staffRef, { displayOrder: i });
        });

        try {
            await batch.commit();
            refetchStaff();
        } catch (error) {
            console.error("Error updating display order:", error);
        }
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;

        const reorderedStaff = Array.from(staffData);
        const [removed] = reorderedStaff.splice(result.source.index, 1);
        reorderedStaff.splice(result.destination.index, 0, removed);

        setStaffData(reorderedStaff);
    };
    const handleMouseEnter = (e, shift) => {
        const content = (
            <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${unitsMap[shift.unitId]?.color || 'bg-gray-600'}`}></div>
                <span>{(shift.status && Array.isArray(shift.status)) ? shift.status.join(', ') : 'N/A'}</span>
            </div>
        );
        setTooltip({ visible: true, content, x: e.clientX, y: e.clientY });
    };

    const handleMouseLeave = () => {
        setTooltip({ visible: false, content: null, x: 0, y: 0 });
    };

    const statusSymbols = useMemo(() => {
        return statuses.reduce((acc, status) => {
            if (status.name) {
                acc[status.name] = status.symbol || '';
            }
            return acc;
        }, {});
    }, [statuses]);
    
    const workloadColor = (rating) => { if (rating >= 4) return 'bg-green-500'; if (rating === 3) return 'bg-yellow-500'; if (rating <= 2) return 'bg-red-500'; return 'hidden'; };
    
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

    const getDayColoring = (date) => {
        const minStaff = 4;
        const optStaff = 6;
        if (!shifts) return 'bg-gray-800';
        const dayShifts = shifts.filter(s => s.date === date.toISOString().split('T')[0] && Array.isArray(s.status) && s.status.includes('Productive'));
        if (dayShifts.length === 0) return 'bg-gray-800';

        const slots = Array(48).fill(0); // 30-min slots
        dayShifts.forEach(shift => {
            const { shiftStart, shiftEnd } = getShiftDateObjects(shift);
            if(shiftStart && shiftEnd) {
                const options = {
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: false,
                    timeZone: 'America/Chicago',
                };
                const startParts = new Intl.DateTimeFormat('en-US', options).formatToParts(shiftStart).reduce((acc, part) => { if(part.type !== 'literal') acc[part.type] = part.value; return acc; }, {});
                const endParts = new Intl.DateTimeFormat('en-US', options).formatToParts(shiftEnd).reduce((acc, part) => { if(part.type !== 'literal') acc[part.type] = part.value; return acc; }, {});

                const start = Math.floor(parseInt(startParts.hour) * 2 + parseInt(startParts.minute) / 30);
                const end = Math.ceil(parseInt(endParts.hour) * 2 + parseInt(endParts.minute) / 30);

                for (let i = start; i < end; i++) {
                    slots[i]++;
                }
            }
        });

        const belowMin = slots.filter(s => s < minStaff).length;
        const atMin = slots.filter(s => s >= minStaff).length;
        const atOpt = slots.filter(s => s >= optStaff).length;
        
        if (belowMin / 48 > 0.3) return 'bg-red-900/50';
        if (atOpt / 48 > 0.7) return 'bg-green-900/50';
        if (atMin / 48 > 0.7) return 'bg-blue-900/50';
        return 'bg-yellow-900/50';
    };

    return (
        <main className="p-8 flex-1 flex flex-col h-full">
            <div className="flex justify-between items-start mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white">Staff Scheduling</h1>
                    <div className="relative mt-4 flex items-center">
                        <Search className="text-gray-400 ml-3" size={20}/>
                        <input type="text" placeholder="Search staff..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-style w-64 pl-10"/>
                    </div>
                </div>
                {!showTodaysView && <div className="flex items-center gap-4">
                    <button onClick={() => handleWeekChange(-7)} className="p-2 rounded-md bg-gray-700 hover:bg-gray-600"><ChevronLeft/></button>
                    <span className="text-xl font-semibold">{dates[0].toLocaleDateString()} - {dates[27].toLocaleDateString()}</span>
                    <button onClick={() => handleWeekChange(7)} className="p-2 rounded-md bg-gray-700 hover:bg-gray-600"><ChevronRight/></button>
                </div>}
                <div className="text-right flex flex-col items-end gap-2">
                    <button onClick={() => setIsPublishModalOpen(true)} className="btn-primary flex items-center gap-2"><Send size={18}/> Publish Schedule</button>
                    <button onClick={() => setShowTodaysView(!showTodaysView)} className="btn-secondary">{showTodaysView ? "Show Full Schedule" : "Show Today's View"}</button>
                    
                </div>
            </div>

            {/* Pending Shifts for Approval Section */}
            <div className="mb-8 bg-gray-800 p-4 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Pending Shifts for Approval ({pendingShifts.length})</h2>
                    <button
                        onClick={() => setIsPendingShiftsExpanded(!isPendingShiftsExpanded)}
                        className="text-gray-400 hover:text-white text-sm"
                    >
                        {isPendingShiftsExpanded ? 'Hide' : 'Show'}
                    </button>
                </div>
                {isPendingShiftsExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingShifts.length === 0 ? (
                            <p className="text-gray-400">No shifts pending approval.</p>
                        ) : (
                            pendingShifts.map(shift => (
                                <div key={shift.id} className="bg-gray-700 p-4 rounded-lg shadow-md">
                                    <p className="font-bold">{unitsMap[shift.unitId]?.name || shift.unitId}</p>
                                    <p className="text-sm">{new Date(shift.startTime.seconds * 1000).toLocaleDateString()} {new Date(shift.startTime.seconds * 1000).toLocaleTimeString()} - {new Date(shift.endTime.seconds * 1000).toLocaleTimeString()}</p>
                                    <p className="text-sm text-blue-400">Claimed by: {shift.claimedByName}</p>
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => handleApproveShift(shift)}
                                            className="btn-primary flex-1"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleRejectShift(shift)}
                                            className="btn-danger flex-1"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Original header and search bar */}
            

            {/* Filters Section */}
            <div className="flex flex-wrap gap-4 mb-4">
                {/* Unit Filter */}
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-2 flex justify-between items-center">
                        Filter by Unit
                        <button onClick={() => setIsUnitFilterExpanded(!isUnitFilterExpanded)} className="text-gray-400 hover:text-white text-sm">
                            {isUnitFilterExpanded ? 'Hide' : 'Show'}
                        </button>
                    </h3>
                    {isUnitFilterExpanded && (
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
                    )}
                </div>

                {/* Job Title Filter */}
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-2 flex justify-between items-center">
                        Filter by Job Title
                        <button onClick={() => setIsJobTitleFilterExpanded(!isJobTitleFilterExpanded)} className="text-gray-400 hover:text-white text-sm">
                            {isJobTitleFilterExpanded ? 'Hide' : 'Show'}
                        </button>
                    </h3>
                    {isJobTitleFilterExpanded && (
                        <div className="flex flex-wrap gap-2">
                            {jobTitles.map(jobTitle => (
                                <label key={jobTitle.id} className="flex items-center gap-1 text-white text-sm">
                                    <input
                                        type="checkbox"
                                        value={jobTitle.name}
                                        checked={selectedJobTitles.includes(jobTitle.name)}
                                        onChange={(e) => {
                                            const { value, checked } = e.target;
                                            setSelectedJobTitles(prev =>
                                                checked ? [...prev, value] : prev.filter(jt => jt !== value)
                                            );
                                        }}
                                        className="h-4 w-4 rounded"
                                    />
                                    {jobTitle.name}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Status Filter */}
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-2 flex justify-between items-center">
                        Filter by Status
                        <button onClick={() => setIsStatusFilterExpanded(!isStatusFilterExpanded)} className="text-gray-400 hover:text-white text-sm">
                            {isStatusFilterExpanded ? 'Hide' : 'Show'}
                        </button>
                    </h3>
                    {isStatusFilterExpanded && (
                        <div className="flex flex-wrap gap-2">
                            {statuses.map(status => (
                                <label key={status.id} className="flex items-center gap-1 text-white text-sm">
                                    <input
                                        type="checkbox"
                                        value={status.name}
                                        checked={selectedStatuses.includes(status.name)}
                                        onChange={(e) => {
                                            const { value, checked } = e.target;
                                            setSelectedStatuses(prev =>
                                                checked ? [...prev, value] : prev.filter(s => s !== value)
                                            );
                                        }}
                                        className="h-4 w-4 rounded"
                                    />
                                    {status.name}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {showTodaysView ? <TodaysView db={db} staffList={filteredStaff} shifts={todaysViewShifts} statusSymbols={statusSymbols} unitsMap={unitsMap} selectedDate={selectedDate} handleDateChange={handleDateChange} /> : (
                <div className="flex-1 h-0 overflow-x-auto">
                    <table className="w-full text-left border-separate" style={{ borderSpacing: '0 0.5rem' }}>
                        <thead>
                            <tr>
                                <th className="p-2 sticky left-0 bg-.gray-900 z-30">Staff Member</th>
                                {dates.map(date => (
                                    <th key={date.toISOString()} className={`p-2 text-center min-w-[100px] rounded-t-lg ${getDayColoring(date)} sticky top-0 z-30`}>
                                        <div className="text-xs text-gray-300">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                        <div>{date.getDate()}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800">
                            {staffLoading ? (
                                <tr><td colSpan={29}>Loading staff...</td></tr>
                            ) : filteredStaff.map((staff, index) => (
                                <tr key={staff.id} className="bg-gray-800">
                                    <td className="p-10 sticky left-0 bg-gray-800 z-10 border-y border-l border-gray-700 rounded-l-lg font-medium whitespace-nowrap min-w-max">
                                        <div className="flex items-center gap-1">
                                            {staff.profilePictureUrl && (
                                                <img src={staff.profilePictureUrl} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                                            )}
                                            <span>{staff.fullName}</span>
                                        </div>
                                        <div className="flex gap-1 mt-1">
                                            <button onClick={() => onViewProfile(staff.id)} className="text-gray-400 hover:text-white p-1 rounded-full bg-gray-700/50">
                                                <User size={14} />
                                            </button>
                                            <button onClick={() => handleOpenApplyTemplateModal(staff)} className="text-gray-400 hover:text-white p-1 rounded-full bg-gray-700/50">
                                                <FilePlus size={14} />
                                            </button>
                                            <button onClick={() => { setSelectedStaffForTemplates(staff); setIsRotationTemplatesModalOpen(true); }} className="text-gray-400 hover:text-white p-1 rounded-full bg-gray-700/50">
                                                <ClipboardList size={14} />
                                            </button>
                                            <button onClick={() => handleReorder(index, 'up')} className="text-gray-400 hover:text-white p-1 rounded-full bg-gray-700/50" disabled={index === 0}>
                                                <ArrowUp size={14} />
                                            </button>
                                            <button onClick={() => handleReorder(index, 'down')} className="text-gray-400 hover:text-white p-1 rounded-full bg-gray-700/50" disabled={index === filteredStaff.length - 1}>
                                                <ArrowDown size={14} />
                                            </button>
                                        </div>
                                    </td>
                                    {dates.map(date => {
                                        const dateString = date.toISOString().split('T')[0];
                                        const shiftsForCell = filteredShifts.filter(s => s.staffId === staff.id && s.date === dateString);
                                        return (
                                            <td key={dateString} className="p-1 border-t border-b border-gray-700 hover:bg-blue-600/20 cursor-pointer h-20 align-top" onClick={() => handleOpenShiftModal(staff, date)}>
                                                <div className="space-y-1">
                                                    {shiftsForCell.map(shift => (
                                                        <div
                                                            key={shift.id}
                                                            onClick={(e) => { e.stopPropagation(); handleOpenShiftModal(staff, date, shift); }}
                                                            onMouseEnter={(e) => handleMouseEnter(e, shift)}
                                                            onMouseLeave={handleMouseLeave}
                                                            className={`relative p-1 rounded text-xs text-white ${unitsMap[shift.unitId]?.color || 'bg-gray-600'} ${!shift.published ? 'opacity-50 border-2 border-dashed border-gray-400' : ''} `}
                                                            title={Array.isArray(shift.status) ? shift.status.join(', ') : shift.status}
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <div>{formatShiftTime(shift)}</div>
                                                                <div className="flex gap-1">
                                                                    {Array.isArray(shift.status) && shift.status.map(s => <span key={s} className="text-xl text-white text-shadow-default">{statusSymbols[s] || '❓'}</span>)}
                                                                </div>
                                                            </div>
                                                            <div className="font-bold">{unitsMap[shift.unitId]?.name || shift.unitId}</div>
                                                            {shift.workloadRating && <div className={`absolute top-1 right-1 h-2 w-2 rounded-full ${workloadColor(shift.workloadRating)}`}></div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <ShiftModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} db={db} shiftInfo={selectedShiftInfo} units={units} statuses={statuses} collectionPath={shiftsPath} />
            <PublishModal isOpen={isPublishModalOpen} onClose={() => setIsPublishModalOpen(false)} db={db} collectionPath={shiftsPath} startDate={dates[0].toISOString().split('T')[0]} endDate={dates[27].toISOString().split('T')[0]}/>
            <ApplyTemplateModal isOpen={isApplyTemplateModalOpen} onClose={() => setIsApplyTemplateModalOpen(false)} db={db} staffMember={selectedStaffForTemplate} shiftsPath={shiftsPath} />
            <RotationTemplatesModal isOpen={isRotationTemplatesModalOpen} onClose={() => setIsRotationTemplatesModalOpen(false)} db={db} staffMember={selectedStaffForTemplates} units={units} statuses={statuses} />
            {tooltip.visible && (
                <div
                    style={{ top: tooltip.y + 10, left: tooltip.x + 10 }}
                    className="absolute z-20 bg-gray-800 text-white p-2 rounded-lg shadow-lg"
                >
                    {tooltip.content}
                </div>
            )}
        </main>
    );
};

export default NewManagerSchedulingPage;