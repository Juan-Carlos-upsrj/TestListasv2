
import { DayOfWeek } from '../types';

const dayOfWeekMap: { [key in DayOfWeek]: number } = {
  'Lunes': 1,
  'Martes': 2,
  'Miércoles': 3,
  'Jueves': 4,
  'Viernes': 5,
  'Sábado': 6,
};

export const getClassDates = (
    startDateStr: string, 
    endDateStr: string, 
    classDays: DayOfWeek[]
): string[] => {
    const dates: string[] = [];
    if (!startDateStr || !endDateStr || classDays.length === 0) return dates;
    
    // Ensure dates are parsed correctly as local time, not UTC
    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T00:00:00');
    
    let currentDate = new Date(startDate);
    const scheduledDays = classDays.map(day => dayOfWeekMap[day]);

    while (currentDate <= endDate) {
        // getDay() returns 0 for Sunday, 1 for Monday etc. We want Monday to be 1.
        const currentDay = currentDate.getDay(); // Sunday is 0
        if (scheduledDays.includes(currentDay)) {
            dates.push(currentDate.toISOString().split('T')[0]);
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
};
