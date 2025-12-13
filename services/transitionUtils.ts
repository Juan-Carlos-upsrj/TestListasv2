
export const parseQuarter = (quarter: string): number | null => {
    if (!quarter) return null;
    const match = quarter.match(/(\d+)/);
    return match ? parseInt(match[0], 10) : null;
};

export const formatQuarter = (num: number): string => {
    return `${num}º`;
};

export const getNextQuarter = (current: string): string => {
    const num = parseQuarter(current);
    if (num === null) return current; // Return same if logic fails
    return formatQuarter(num + 1);
};

export const shouldGraduate = (current: string): boolean => {
    const num = parseQuarter(current);
    if (num === null) return false;
    return num >= 10; // Assuming 10th is the last one
};

export const generateArchiveName = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const startMonth = startDate.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
    const startYear = startDate.toLocaleDateString('es-ES', { year: '2-digit' });
    const endMonth = endDate.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
    const endYear = endDate.toLocaleDateString('es-ES', { year: '2-digit' });
    
    return `Ciclo ${startMonth}${startYear}-${endMonth}${endYear}`;
};
