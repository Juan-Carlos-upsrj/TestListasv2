
import { Group, Settings, AttendanceStatus, Evaluation, EvaluationType } from '../types';
import { getClassDates } from './dateUtils';

export const getGradeColor = (grade: number | null): string => {
    if (grade === null) return '';
    return grade >= 7 ? 'text-accent-green-dark' : grade >= 6 ? 'text-accent-yellow-dark' : 'text-accent-red';
};

export const calculateAttendancePercentage = (
    group: Group,
    partial: 1 | 2,
    settings: Settings,
    attendanceData: { [date: string]: AttendanceStatus }
): number => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Rango de fechas del parcial pivotado en p1EvalEnd
    const start = settings.semesterStart;
    const end = partial === 1 ? settings.p1EvalEnd : settings.semesterEnd;
    
    let partialStart = start;
    if (partial === 2) {
        // El parcial 2 empieza después de que termine el 1 (p1EvalEnd)
        const p1End = new Date(settings.p1EvalEnd + 'T00:00:00');
        p1End.setDate(p1End.getDate() + 1);
        partialStart = p1End.toISOString().split('T')[0];
    }
    
    const dates = getClassDates(partialStart, end, group.classDays);
    if (dates.length === 0) return 100;

    let presentCount = 0;
    let totalCount = 0;
    
    dates.forEach(date => {
        const status = (attendanceData[date] || AttendanceStatus.Pending) as AttendanceStatus;
        
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
    special: number | null
): { score: number | null; type: 'Ordinario' | 'Remedial' | 'Extra' | 'Especial' | 'N/A'; isFailing: boolean } => {
    
    if (p1Avg === null || p2Avg === null) return { score: null, type: 'N/A', isFailing: false };
    
    const effectiveP1 = remedialP1 !== null ? remedialP1 : p1Avg;
    const effectiveP2 = remedialP2 !== null ? remedialP2 : p2Avg;

    const ordinaryAvg = (effectiveP1 + effectiveP2) / 2;

    if (special !== null) {
        return { score: special, type: 'Especial', isFailing: special < 7 };
    }
    
    if (extra !== null) {
        return { score: extra, type: 'Extra', isFailing: extra < 7 };
    }

    const failedRemedialP1 = remedialP1 !== null && remedialP1 < 7;
    const failedRemedialP2 = remedialP2 !== null && remedialP2 < 7;
    
    if (failedRemedialP1 || failedRemedialP2) {
        return { score: ordinaryAvg, type: 'Ordinario', isFailing: true }; 
    }

    if (ordinaryAvg < 7) {
        return { score: ordinaryAvg, type: 'Ordinario', isFailing: true };
    }

    const type = (remedialP1 !== null || remedialP2 !== null) ? 'Remedial' : 'Ordinario';
    return { score: ordinaryAvg, type, isFailing: false };
};
