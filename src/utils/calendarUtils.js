export const generateIcsContent = (shifts, unitsMap, statusSymbols) => {
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Your Company//Staff Scheduling App//EN
`;

    shifts.forEach(shift => {
        const unitName = unitsMap[shift.unitId]?.name || shift.unitId;
        const shiftSummary = `Shift at ${unitName}`;
        const shiftDescription = `Time: ${shift.startTime} - ${shift.endTime}\nUnit: ${unitName}\nStatus: ${Array.isArray(shift.status) ? shift.status.map(s => `${s} ${statusSymbols[s] || ''}`).join(', ') : shift.status}`;

        // Ensure dates are in UTC and formatted correctly for ICS
        const dtStart = new Date(shift.shiftStartDateTime).toISOString().replace(/[-:]|\.\d{3}/g, '') + 'Z';
        const dtEnd = new Date(shift.shiftEndDateTime).toISOString().replace(/[-:]|\.\d{3}/g, '') + 'Z';
        const dtStamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '') + 'Z';

        icsContent += `BEGIN:VEVENT
UID:${shift.id}@staffscheduling.com
DTSTAMP:${dtStamp}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${shiftSummary}
DESCRIPTION:${shiftDescription}
LOCATION:${unitName}
END:VEVENT
`;
    });

    icsContent += `END:VCALENDAR`;
    return icsContent;
};