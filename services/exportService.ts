
import { Group, Evaluation, AttendanceStatus } from '../types';
import { saveOrShareFile } from './fileUtils';

export const generateAttendanceCSVContent = (
    group: Group,
    classDates: string[],
    attendance: { [studentId: string]: { [date: string]: AttendanceStatus } }
): string => {
    let csvRows = [];
    // Header
    const header = ['Matrícula', 'Nombre', ...classDates];
    csvRows.push(header.join(','));

    // Rows
    group.students.forEach(student => {
        const row = [
            student.matricula || '',
            `"${student.name}"`,
            ...classDates.map(date => {
                const status = attendance[student.id]?.[date] || AttendanceStatus.Pending;
                switch(status) {
                    case AttendanceStatus.Present: return 'P';
                    case AttendanceStatus.Absent: return 'A';
                    case AttendanceStatus.Late: return 'R';
                    case AttendanceStatus.Justified: return 'J';
                    case AttendanceStatus.Exchange: return 'I';
                    default: return '';
                }
            })
        ];
        csvRows.push(row.join(','));
    });
    return csvRows.join('\r\n');
};

export const generateGradesCSVContent = (
    group: Group,
    evaluations: Evaluation[],
    grades: { [studentId: string]: { [evaluationId: string]: number | null } }
): string => {
    let csvRows = [];
    // Header
    const header = ['Matrícula', 'Nombre', ...evaluations.map(e => `"${e.name} (${e.maxScore} pts)"`)];
    csvRows.push(header.join(','));

    // Rows
    group.students.forEach(student => {
        const row = [
            student.matricula || '',
            `"${student.name}"`,
            ...evaluations.map(ev => {
                const grade = grades[student.id]?.[ev.id];
                return grade !== undefined && grade !== null ? grade.toString() : '';
            })
        ];
        csvRows.push(row.join(','));
    });
    return csvRows.join('\r\n');
};

export const exportAttendanceToCSV = async (
    group: Group,
    classDates: string[],
    attendance: { [studentId: string]: { [date: string]: AttendanceStatus } },
    fileName?: string
) => {
    const content = generateAttendanceCSVContent(group, classDates, attendance);
    const finalName = fileName ? `${fileName}.csv` : `asistencia_${group.name.replace(/\s/g, '_')}.csv`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    await saveOrShareFile(blob, finalName);
};

export const exportGradesToCSV = async (
    group: Group,
    evaluations: Evaluation[],
    grades: { [studentId: string]: { [evaluationId: string]: number | null } },
    fileName?: string
) => {
    const content = generateGradesCSVContent(group, evaluations, grades);
    const finalName = fileName ? `${fileName}.csv` : `calificaciones_${group.name.replace(/\s/g, '_')}.csv`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    await saveOrShareFile(blob, finalName);
};
