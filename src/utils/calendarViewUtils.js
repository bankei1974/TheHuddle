
import { startOfMonth, endOfMonth, eachDayOfInterval, format, startOfWeek, endOfWeek } from 'date-fns';

export const getDaysInMonth = (date) => {
  const start = startOfWeek(startOfMonth(date));
  const end = endOfWeek(endOfMonth(date));
  return eachDayOfInterval({ start, end });
};

export const getWeekdays = () => {
  const now = new Date();
  const week = eachDayOfInterval({
    start: startOfWeek(now),
    end: endOfWeek(now),
  });
  return week.map(day => format(day, 'EEEE'));
};
