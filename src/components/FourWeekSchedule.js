import React from 'react';

const FourWeekSchedule = ({ shifts, staff, units, startDate }) => {
    const dates = Array.from({ length: 28 }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return date;
    });

    const staffWithShifts = staff.map(staffMember => {
        const staffShifts = shifts.filter(shift => shift.staffId === staffMember.id);
        return {
            ...staffMember,
            shifts: staffShifts
        };
    });

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-gray-700">
                        <th className="p-2">Staff Member</th>
                        {dates.map(date => (
                            <th key={date.toISOString()} className="p-2 text-center">
                                {date.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' })}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {staffWithShifts.map(staffMember => (
                        <tr key={staffMember.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                            <td className="p-2">{staffMember.fullName}</td>
                            {dates.map(date => {
                                const shift = staffMember.shifts.find(s => s.date === date.toISOString().split('T')[0]);
                                return (
                                    <td key={date.toISOString()} className="p-2 text-center">
                                        {shift ? `${shift.startTime} - ${shift.endTime}` : ''}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default FourWeekSchedule;
