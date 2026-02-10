import { Group, Settings, AttendanceStatus, Evaluation, EvaluationType } from '../types';
import { getClassDates } from './dateUtils';

export const getGradeColor = (grade: number | null): string => {
    if (grade === null) return '';
    return grade >= 7 ? 'text-accent-green-dark' : grade >= 6 ? 'text-accent-yellow-dark' : 'text-accent-red';
};

export const calculateAttendancePercentage = (
    group: Group,
    partial: 1 | 2 | 'global',
    settings: Settings,
    attendanceData: { [date: string]: AttendanceStatus }
): number => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    let start = settings.semesterStart;
    let end = settings.semesterEnd;

    if (partial === 1) {
        end = settings.p1EvalEnd;
    } else if (partial === 2) {
        const p1End = new Date(settings.p1EvalEnd + 'T00:00:00');
        p1End.setDate(p1End.getDate() + 1);
        start = p1End.toISOString().split('T')[0];
    }
    
    const dates = getClassDates(start, end, group.classDays);
    if (dates.length === 0) return 100;

    let presentCount = 0;
    let totalCount = 0;
    
    dates.forEach(date => {
        const status = (attendanceData[date] || AttendanceStatus.Pending) as AttendanceStatus;
        
        // Contamos días pasados o días que ya tengan un registro explícito
        if (date <= todayStr || status !== AttendanceStatus.Pending) {
            totalCount++;
            if (status === AttendanceStatus.Present || 
                status === AttendanceStatus.Late || 
                status === AttendanceStatus.Justified || 
                status === AttendanceStatus.Exchange) {
                presentCount++;
            }
        }
    });

    return totalCount > 0 ? (presentCount / totalCount) * 100 : 100;
};

export const calculatePartialAverage = (
    group: Group,
    partial: 1 | 2,
    groupEvaluations: Evaluation[],
    studentGrades: { [evaluationId: string]: number | null },
    settings: Settings,
    studentAttendance: { [date: string]: AttendanceStatus }
): number | null => {
    const types: EvaluationType[] = partial === 1 ? group.evaluationTypes.partial1 : group.evaluationTypes.partial2;
    const evaluationsForPartial = groupEvaluations.filter(e => e.partial === partial);

    let finalPartialScore = 0;
    let totalWeightOfGradedItems = 0;

    types.forEach(type => {
        const weight = Number(type.weight) || 0;
        
        if (type.isAttendance) {
            const attendancePct = calculateAttendancePercentage(group, partial, settings, studentAttendance);
            // Convertimos porcentaje (0-100) a nota (0-10) ponderada
            finalPartialScore += (attendancePct / 100) * weight;
            totalWeightOfGradedItems += weight;
        } else {
            const evalsOfType = evaluationsForPartial.filter(ev => ev.typeId === type.id);
            if (evalsOfType.length === 0) return;

            let totalScoreForType = 0;
            let maxScoreForType = 0;
            let hasGradesForType = false;

            evalsOfType.forEach(ev => {
                const grade = studentGrades[ev.id];
                if (grade !== null && grade !== undefined) {
                    totalScoreForType += grade;
                    maxScoreForType += ev.maxScore;
                    hasGradesForType = true;
                }
            });

            if (hasGradesForType && maxScoreForType > 0) {
                const typePercentage = totalScoreForType / maxScoreForType;
                finalPartialScore += typePercentage * weight;
                totalWeightOfGradedItems += weight;
            }
        }
    });

    if (totalWeightOfGradedItems === 0) return null;

    const weightedAverage = (finalPartialScore / totalWeightOfGradedItems) * 10;
    return weightedAverage;
};

export const calculateFinalGradeWithRecovery = (
    p1Avg: number | null,
    p2Avg: number | null,
    remedialP1: number | null,
    remedialP2: number | null,
    extra: number | null,
    special: number | null,
    globalAttendancePct: number,
    threshold: number = 80
): { score: number | null; type: string; isFailing: boolean; lowAttendance: boolean } => {
    
    const lowAttendance = globalAttendancePct < threshold;
    
    if (p1Avg === null && p2Avg === null) return { score: null, type: 'N/A', isFailing: false, lowAttendance };
    
    const effectiveP1 = remedialP1 !== null ? remedialP1 : (p1Avg ?? 0);
    const effectiveP2 = remedialP2 !== null ? remedialP2 : (p2Avg ?? 0);

    const ordinaryAvg = (effectiveP1 + effectiveP2) / 2;

    let finalScore = ordinaryAvg;
    let type = (remedialP1 !== null || remedialP2 !== null) ? 'Remedial' : 'Ordinario';

    if (special !== null) {
        finalScore = special;
        type = 'Especial';
    } else if (extra !== null) {
        finalScore = extra;
        type = 'Extra';
    }

    // Un alumno reprueba si la nota es < 7 O si tiene baja asistencia
    const isFailingByGrades = finalScore < 7;
    const isFailing = isFailingByGrades || lowAttendance;

    return { 
        score: finalScore, 
        type: lowAttendance ? `${type} (Faltas)` : type, 
        isFailing, 
        lowAttendance 
    };
};