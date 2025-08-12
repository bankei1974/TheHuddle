const CENTRAL_TIMEZONE = 'America/Chicago';

/**
 * Creates a UTC Date object from a date string ('YYYY-MM-DD') and time components,
 * assuming the input represents a wall-clock time in 'America/Chicago'.
 * This function is designed to be robust against DST changes and browser timezone differences.
 * @param {string} dateString - The date in 'YYYY-MM-DD' format.
 * @param {number} [hours=0] - The hours in Central Time (0-23).
 * @param {number} [minutes=0] - The minutes in Central Time (0-59).
 * @param {number} [seconds=0] - The seconds in Central Time (0-59).
 * @returns {Date} A new Date object representing the specified time in UTC.
 */
export const createUtcDateFromCentralTime = (dateString, hours = 0, minutes = 0, seconds = 0) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);

    // 1. Create a UTC date with the given year, month, day, etc. This is our reference point.
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));

    // 2. Format this UTC date into parts as it would appear in the Central timezone.
    // This tells us what the "wall clock" time in Chicago would be for our UTC timestamp.
    const centralParts = new Intl.DateTimeFormat('en-US', {
        timeZone: CENTRAL_TIMEZONE,
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
    }).formatToParts(utcDate).reduce((acc, part) => {
        if (part.type !== 'literal') {
            // Use 'hour' for 'dayPeriod' if it exists, otherwise use 'hour'
            const key = part.type === 'dayPeriod' && !acc['hour'] ? 'hour' : part.type;
            acc[key] = parseInt(part.value, 10);
        }
        return acc;
    }, {});
    
    // Intl.DateTimeFormat can return hour: 24. JS Date object expects 0-23.
    if (centralParts.hour === 24) {
        centralParts.hour = 0;
    }

    // 3. Create a UTC date from the *original* components. This is the time we were aiming for.
    const targetDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));

    // 4. Create a UTC date from the *Central time parts*. This is what our reference date *looks like* on a clock in Chicago.
    const apparentDate = new Date(Date.UTC(centralParts.year, centralParts.month - 1, centralParts.day, centralParts.hour, centralParts.minute, centralParts.second));

    // 5. The difference between these two dates is the timezone offset in milliseconds.
    const offset = apparentDate.getTime() - targetDate.getTime();

    // 6. Subtract this offset from our original UTC date to get the correct UTC time that corresponds to the desired Central time.
    return new Date(utcDate.getTime() - offset);
};

export const formatDateInCentralTime = (date) => {
    if (!date) return '';
    
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: CENTRAL_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    
    return formatter.format(date);
};

