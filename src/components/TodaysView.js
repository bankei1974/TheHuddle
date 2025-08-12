import React, { useState, useMemo } from 'react';

const TodaysView = ({ db, staffList, shifts, statusSymbols, unitsMap, selectedDate, handleDateChange }) => {
    const [tooltip, setTooltip] = useState({ visible: false, content: null, x: 0, y: 0 });

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

    const todaysShifts = useMemo(() => (shifts || []).filter(shift => shift.date === selectedDate.toISOString().split('T')[0]), [shifts, selectedDate]);

    const shiftsByUnitAndJobTitle = useMemo(() => {
        const grouped = {};
        todaysShifts.forEach(shift => {
            const unitName = unitsMap[shift.unitId]?.name || 'Unassigned';
            const staffMember = staffList.find(s => s.id === shift.staffId);
            const jobTitle = staffMember ? staffMember.jobTitle : 'Unknown';

            if (!grouped[unitName]) {
                grouped[unitName] = {};
            }
            if (!grouped[unitName][jobTitle]) {
                grouped[unitName][jobTitle] = [];
            }
            grouped[unitName][jobTitle].push(shift);
        });

        // Sort shifts within each group
        for (const unit in grouped) {
            for (const jobTitle in grouped[unit]) {
                grouped[unit][jobTitle].sort((a, b) => {
                    if (a.startTime < b.startTime) return -1;
                    if (a.startTime > b.startTime) return 1;
                    if (a.endTime < b.endTime) return -1;
                    if (a.endTime > b.endTime) return 1;
                    return 0;
                });
            }
        }

        return grouped;
    }, [todaysShifts, staffList, unitsMap]);

    const getStaffName = (staffId) => {
        const staffMember = staffList.find(s => s.id === staffId);
        return staffMember ? staffMember.fullName : 'Unknown Staff';
    };

    return (
        <div className="p-4 bg-gray-900 rounded-lg animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">Today's Schedule ({selectedDate.toLocaleDateString()})</h2>
            <div className="flex justify-center mb-4">
                <input 
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={handleDateChange}
                    className="bg-gray-700 text-white p-2 rounded-md"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                {Object.entries(shiftsByUnitAndJobTitle).sort(([unitA], [unitB]) => unitA.localeCompare(unitB)).map(([unit, jobTitles]) => (
                    <div key={unit} className={`p-4 rounded-lg shadow-lg border border-gray-700 flex flex-col ${Object.values(unitsMap).find(u => u.name === unit)?.color || 'bg-gray-700'}`}>
                        <h3 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2 flex-shrink-0">{unit}</h3>
                        <div className="space-y-2 overflow-y-auto">
                            {Object.entries(jobTitles).map(([jobTitle, shifts]) => (
                                <div key={jobTitle}>
                                    <h4 className="text-lg font-semibold text-white mb-2">{jobTitle}</h4>
                                    <div className="space-y-0.5">
                                        {shifts.map(shift => (
                                            <div 
                                                key={shift.id} 
                                                className="p-2 bg-black/30 rounded-lg relative"
                                                onMouseEnter={(e) => handleMouseEnter(e, shift)}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                <p className="font-semibold text-sm text-white flex items-center gap-1">
                                                    {getStaffName(shift.staffId)} ({shift.startTime}-{shift.endTime})
                                                    {Array.isArray(shift.status) && shift.status.map(s => <span key={s} title={s} className="text-base">{statusSymbols[s] || '❓'}</span>)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {tooltip.visible && (
                <div
                    style={{ top: tooltip.y + 10, left: tooltip.x + 10 }}
                    className="absolute z-50 bg-gray-800 text-white p-2 rounded-lg shadow-lg"
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
};

export default TodaysView;
