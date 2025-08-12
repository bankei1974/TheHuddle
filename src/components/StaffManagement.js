import React, { useState, useMemo, useCallback } from 'react';
import { doc, deleteDoc, getDocs, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection } from '../hooks/useCollection';
import { Link } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, Search, User } from 'lucide-react';

const StaffManagement = ({ db, onViewProfile }) => {
    const usersPath = `users`;
    const { data: staff, loading: staffLoading } = useCollection(db, usersPath);
    const { data: units } = useCollection(db, `units`);
    const { data: jobTitles } = useCollection(db, `jobTitles`);
    const { data: statuses } = useCollection(db, `statuses`);
    const { data: shifts } = useCollection(db, `shifts`);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUnits, setSelectedUnits] = useState([]);
    const [selectedJobTitles, setSelectedJobTitles] = useState([]);
    const [isUnitFilterExpanded, setIsUnitFilterExpanded] = useState(false);
    const [isJobTitleFilterExpanded, setIsJobTitleFilterExpanded] = useState(false);

    const handleDelete = async (id) => { if (window.confirm("Are you sure you want to delete this staff member?")) await deleteDoc(doc(db, usersPath, id)); };
    
    const formatSelected = (selected, allItems) => {
        if (selected.length === 0) return '';
        if (selected.length === allItems.length) return '(All)';
        if (selected.length <= 2) return `(${selected.join(', ')})`;
        return `(${selected.length} selected)`;
    };

    const sortedStaff = useMemo(() => 
        [...staff].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
    , [staff]);

    const filteredStaff = useMemo(() => {
        let currentStaff = [...sortedStaff];

        if (searchQuery) {
            currentStaff = currentStaff.filter(s => s.fullName && s.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        if (selectedUnits.length > 0) {
            currentStaff = currentStaff.filter(s => s.predominantUnit && selectedUnits.includes(s.predominantUnit));
        }

        if (selectedJobTitles.length > 0) {
            currentStaff = currentStaff.filter(s => s.jobTitle && selectedJobTitles.includes(s.jobTitle));
        }

        return currentStaff;
    }, [sortedStaff, searchQuery, selectedUnits, selectedJobTitles]);

    const calculateCallOutInstances = useCallback((staffId) => {
        if (!shifts) return 0;

        const staffShifts = shifts.filter(shift => shift.staffId === staffId);

        // Group shifts by date for easier processing
        const shiftsByDate = staffShifts.reduce((acc, shift) => {
            acc[shift.date] = acc[shift.date] || [];
            acc[shift.date].push(shift);
            return acc;
        }, {});

        const datesWithShifts = Object.keys(shiftsByDate).sort();

        if (datesWithShifts.length === 0) return 0;

        let callOutInstances = 0;
        let inCallOutPeriod = false;

        // Iterate through all days from the first shift to the last shift
        const firstShiftDate = new Date(datesWithShifts[0]);
        const lastShiftDate = new Date(datesWithShifts[datesWithShifts.length - 1]);

        for (let d = new Date(firstShiftDate); d <= lastShiftDate; d.setDate(d.getDate() + 1)) {
            const currentDateISO = d.toISOString().split('T')[0];
            const shiftsOnDay = shiftsByDate[currentDateISO] || [];

            const hasCallOutShift = shiftsOnDay.some(shift => shift.status && shift.status.includes('Call out'));
            const hasWorkedShift = shiftsOnDay.some(shift => shift.status && !shift.status.includes('Call out'));

            if (hasCallOutShift) {
                if (!inCallOutPeriod) {
                    callOutInstances++;
                    inCallOutPeriod = true;
                }
            } else if (hasWorkedShift) {
                // A worked shift breaks the call-out period
                inCallOutPeriod = false;
            } else {
                // No shift on this day, call-out period continues if already in one
                // inCallOutPeriod remains unchanged
            }
        }
        return callOutInstances;
    }, [shifts]);

    const staffWithCallOuts = useMemo(() => {
        return filteredStaff.map(staffMember => ({
            ...staffMember,
            callOutInstances: calculateCallOutInstances(staffMember.id)
        }));
    }, [filteredStaff, calculateCallOutInstances]);

    const awardPerfectAttendance = async () => {
        if (!window.confirm("Are you sure you want to award perfect attendance bonuses for the previous month? This action cannot be undone.")) {
            return;
        }

        const today = new Date();
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

        const prevMonthStartISO = prevMonth.toISOString().split('T')[0];
        const prevMonthEndISO = prevMonthEnd.toISOString().split('T')[0];

        for (const member of staff) {
            // Check if bonus already awarded for this month
            if (member.lastPerfectAttendanceAwardMonth === prevMonthStartISO) {
                console.log(`Bonus already awarded to ${member.fullName} for ${prevMonthStartISO}`);
                continue;
            }

            const staffShiftsInMonth = shifts.filter(shift => 
                shift.staffId === member.id && 
                shift.date >= prevMonthStartISO && 
                shift.date <= prevMonthEndISO
            );

            const hasCallOut = staffShiftsInMonth.some(shift => 
                shift.status && shift.status.includes('Call out')
            );

            if (!hasCallOut) {
                const userRef = doc(db, usersPath, member.id);
                const newKarma = (member.staffKarma || 0) + 20; // Award 20 karma points
                await updateDoc(userRef, {
                    staffKarma: newKarma,
                    lastPerfectAttendanceAwardMonth: prevMonthStartISO,
                });
                await addDoc(collection(db, 'karmaTransactions'), {
                    staffId: member.id,
                    date: prevMonthEndISO,
                    karmaChange: 20,
                    reason: 'Perfect Attendance Bonus',
                    transactionType: 'Award',
                    timestamp: serverTimestamp(),
                });
                console.log(`Awarded 20 karma to ${member.fullName} for perfect attendance in ${prevMonthStartISO}`);
            }
        }
        alert("Perfect attendance bonuses processed!");
    };

    return (
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold">Staff Profiles</h3>
                <div className="flex gap-2">
                    <button onClick={awardPerfectAttendance} className="btn-secondary flex items-center gap-2">Award Perfect Attendance</button>
                    <Link to="/staff-form" className="btn-primary flex items-center gap-2"><PlusCircle size={18} /> Add Staff</Link>
                </div>
            </div>

            <div className="relative mt-4 mb-4 flex items-center">
                <Search className="text-gray-400 ml-3" size={20}/>
                <input 
                    type="text" 
                    placeholder="Search staff..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="input-style w-64 pl-10"
                />
            </div>

            {/* Filters Section */}
            <div className="flex flex-wrap gap-4 mb-4">
                {/* Unit Filter */}
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-2 flex justify-between items-center">
                        Filter by Unit {formatSelected(selectedUnits, units)}
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
                        Filter by Job Title {formatSelected(selectedJobTitles, jobTitles)}
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

                {/* Status Filter (Not directly applicable to staff, but keeping for consistency if needed later) */}
                {/* <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
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
                </div> */}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead><tr className="border-b border-gray-700"><th className="p-4">Picture</th><th className="p-4">Name</th><th className="p-4">Job Title</th><th className="p-4">Unit</th><th className="p-4">Call Out Instances</th><th className="p-4">Staff Karma</th><th className="p-4">Actions</th></tr></thead>
                    <tbody>{staffLoading ? <tr><td colSpan="7" className="text-center p-4">Loading...</td></tr> : staffWithCallOuts.map(member => (<tr key={member.id} className="border-b border-gray-700 hover:bg-gray-700/50"><td className="p-4">{member.profilePictureUrl ? <img src={member.profilePictureUrl} alt="Profile" className="w-10 h-10 rounded-full object-cover" /> : null}</td><td className="p-4">{member.fullName}</td><td className="p-4">{member.jobTitle}</td><td className="p-4">{member.predominantUnit}</td><td className="p-4">{member.callOutInstances}</td><td className="p-4">{member.staffKarma || 0}</td><td className="p-4 flex gap-2"><button onClick={() => onViewProfile(member.id)} className="text-gray-400 hover:text-white"><User size={18} /></button><Link to={`/staff-form/${member.id}`} className="text-gray-400 hover:text-white"><Edit size={18} /></Link><button onClick={() => handleDelete(member.id)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button></td></tr>))}</tbody>
                </table>
            </div>

            <div className="mt-8 bg-gray-800 p-6 rounded-2xl border border-gray-700">
                <h3 className="text-2xl font-semibold mb-4">Staff Karma Leaderboard</h3>
                {staffLoading ? (
                    <p>Loading leaderboard...</p>
                ) : (
                    <ol className="list-decimal list-inside space-y-2">
                        {staff.sort((a, b) => (b.staffKarma || 0) - (a.staffKarma || 0)).map((member, index) => (
                            <li key={member.id} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
                                <span>{index + 1}. {member.fullName}</span>
                                <span className="font-bold">{member.staffKarma || 0} Karma</span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </div>
    );
};

export default StaffManagement;