import React, { useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import { Evaluation, Group } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import { GroupForm } from './GroupManagement';
import { calculatePartialAverage, getGradeColor, calculateAttendancePercentage, calculateFinalGradeWithRecovery } from '../services/gradeCalculation';
import GradeImageModal from './GradeImageModal';

// Special IDs for recovery grades
const GRADE_REMEDIAL_P1 = 'GRADE_REMEDIAL_P1';
const GRADE_REMEDIAL_P2 = 'GRADE_REMEDIAL_P2';
const GRADE_EXTRA = 'GRADE_EXTRA';
const GRADE_SPECIAL = 'GRADE_SPECIAL';

const EvaluationForm: React.FC<{
    evaluation?: Evaluation;
    group: Group;
    onSave: (evaluation: Evaluation) => void;
    onCancel: () => void;
}> = ({ evaluation, group, onSave, onCancel }) => {
    const [name, setName] = useState(evaluation?.name || '');
    const [maxScore, setMaxScore] = useState(evaluation?.maxScore || 10);
    const [partial, setPartial] = useState<1 | 2>(evaluation?.partial || 1);
    
    const availableTypes = (partial === 1 ? group.evaluationTypes.partial1 : group.evaluationTypes.partial2).filter(t => !t.isAttendance);
    const [typeId, setTypeId] = useState(evaluation?.typeId || availableTypes[0]?.id || '');

    useEffect(() => {
        const newAvailableTypes = (partial === 1 ? group.evaluationTypes.partial1 : group.evaluationTypes.partial2).filter(t => !t.isAttendance);
        if (!newAvailableTypes.some(t => t.id === typeId)) {
            setTypeId(newAvailableTypes[0]?.id || '');
        }
    }, [partial, typeId, group.evaluationTypes]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || maxScore <= 0 || !typeId) {
            alert('Por favor, completa todos los campos, incluyendo un tipo de evaluación válido.');
            return;
        }
        onSave({ id: evaluation?.id || uuidv4(), name, maxScore, partial, typeId });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="evalName" className="block text-sm font-medium text-text-primary">Nombre de la Evaluación</label>
                    <input type="text" id="evalName" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="maxScore" className="block text-sm font-medium text-text-primary">Puntuación Máxima</label>
                        <input type="number" id="maxScore" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} min="1" required className="mt-1 block w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                        <label htmlFor="partial" className="block text-sm font-medium text-text-primary">Parcial</label>
                        <select id="partial" value={partial} onChange={e => setPartial(Number(e.target.value) as 1 | 2)} className="mt-1 block w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary">
                            <option value={1}>Primer Parcial</option>
                            <option value={2}>Segundo Parcial</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="typeId" className="block text-sm font-medium text-text-primary">Tipo de Evaluación</label>
                        <select id="typeId" value={typeId} onChange={e => setTypeId(e.target.value)} className="mt-1 block w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary" disabled={availableTypes.length === 0}>
                            {availableTypes.length === 0 && <option>No hay tipos de evaluación disponibles</option>}
                            {availableTypes.map(type => <option key={type.id} value={type.id}>{type.name} ({type.weight}%)</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">{evaluation ? 'Guardar Cambios' : 'Crear Evaluación'}</Button>
            </div>
        </form>
    );
};


const GradesView: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, evaluations, grades, selectedGroupId, attendance, settings } = state;

    const [isEvalModalOpen, setEvalModalOpen] = useState(false);
    const [isGroupConfigOpen, setGroupConfigOpen] = useState(false);
    const [isImageModalOpen, setImageModalOpen] = useState(false);
    const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | undefined>(undefined);
    
    // View Mode: 'ordinary' or 'recovery'
    const [viewMode, setViewMode] = useState<'ordinary' | 'recovery'>('ordinary');

    const setSelectedGroupId = useCallback((id: string | null) => {
        dispatch({ type: 'SET_SELECTED_GROUP', payload: id });
    }, [dispatch]);

    const group = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
    const groupEvaluations = useMemo(() => (evaluations[selectedGroupId || ''] || []), [evaluations, selectedGroupId]);
    const groupGrades = useMemo(() => grades[selectedGroupId || ''] || {}, [grades, selectedGroupId]);

    const p1Evaluations = useMemo(() => groupEvaluations.filter(e => e.partial === 1), [groupEvaluations]);
    const p2Evaluations = useMemo(() => groupEvaluations.filter(e => e.partial === 2), [groupEvaluations]);

    const p1AttendanceType = useMemo(() => group?.evaluationTypes.partial1.find(t => t.isAttendance), [group]);
    const p2AttendanceType = useMemo(() => group?.evaluationTypes.partial2.find(t => t.isAttendance), [group]);

    useEffect(() => {
        if (!selectedGroupId && groups.length > 0) {
            setSelectedGroupId(groups[0].id);
        }
    }, [groups, selectedGroupId, setSelectedGroupId]);
    
    // Filter Students for Recovery View
    const studentsForRecovery = useMemo(() => {
        if (!group || viewMode === 'ordinary') return group?.students || [];
        
        return group.students.filter(student => {
            const p1Avg = calculatePartialAverage(group, 1, evaluations[group.id] || [], groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
            const p2Avg = calculatePartialAverage(group, 2, evaluations[group.id] || [], groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
            
            const remedialP1 = groupGrades[student.id]?.[GRADE_REMEDIAL_P1] ?? null;
            const remedialP2 = groupGrades[student.id]?.[GRADE_REMEDIAL_P2] ?? null;
            const extra = groupGrades[student.id]?.[GRADE_EXTRA] ?? null;
            const special = groupGrades[student.id]?.[GRADE_SPECIAL] ?? null;

            const { isFailing } = calculateFinalGradeWithRecovery(p1Avg, p2Avg, remedialP1, remedialP2, extra, special);
            
            // Show if currently failing OVERALL, OR if they failed a partial individually (requiring remedial)
            const failsP1 = p1Avg !== null && p1Avg < 7;
            const failsP2 = p2Avg !== null && p2Avg < 7;
            
            return isFailing || failsP1 || failsP2;
        });
    }, [group, viewMode, groupGrades, evaluations, settings, attendance]);


    const handleSaveEvaluation = (evaluation: Evaluation) => {
        if (selectedGroupId) {
            dispatch({ type: 'SAVE_EVALUATION', payload: { groupId: selectedGroupId, evaluation } });
            dispatch({ type: 'ADD_TOAST', payload: { message: `Evaluación '${evaluation.name}' guardada.`, type: 'success' } });
            setEvalModalOpen(false);
            setEditingEvaluation(undefined);
        }
    };
    
    const handleUpdateGroup = (updatedGroup: Group) => {
        dispatch({ type: 'SAVE_GROUP', payload: updatedGroup });
        dispatch({ type: 'ADD_TOAST', payload: { message: `Configuración del grupo actualizada.`, type: 'success' } });
        setGroupConfigOpen(false);
    };

    const handleDeleteEvaluation = (evaluationId: string) => {
        if (!selectedGroupId) return;
        const evaluation = groupEvaluations.find(e => e.id === evaluationId);
        if (!evaluation) return;
        
        const gradesCount = Object.values(groupGrades).filter(studentGrades => 
            studentGrades[evaluationId] !== null && 
            studentGrades[evaluationId] !== undefined
        ).length;
        
        const message = gradesCount > 0
            ? `¿Eliminar "${evaluation.name}"?\n\nSe borrarán ${gradesCount} calificación(es) registrada(s).`
            : `¿Eliminar "${evaluation.name}"?\n\nNo hay calificaciones registradas aún.`;
        
        if (window.confirm(message)) {
            dispatch({ type: 'DELETE_EVALUATION', payload: { groupId: selectedGroupId, evaluationId } });
            dispatch({ type: 'ADD_TOAST', payload: { message: `Evaluación '${evaluation.name}' eliminada.`, type: 'error' }});
        }
    };

    const handleGradeChange = (studentId: string, evaluationId: string, score: string) => {
        if (selectedGroupId) {
            const scoreValue = score === '' ? null : parseFloat(score);
            const evaluation = groupEvaluations.find(ev => ev.id === evaluationId);
            
            // Validation for standard evaluations
            if (evaluation && scoreValue !== null && (scoreValue < 0 || scoreValue > evaluation.maxScore)) {
                dispatch({ type: 'ADD_TOAST', payload: { message: `La calificación no puede ser mayor a ${evaluation.maxScore}`, type: 'error' } });
                return;
            }
            
            // Validation for special grades (Remedial, Extra, Special usually max 10)
            if ([GRADE_REMEDIAL_P1, GRADE_REMEDIAL_P2, GRADE_EXTRA, GRADE_SPECIAL].includes(evaluationId) && scoreValue !== null && (scoreValue < 0 || scoreValue > 10)) {
                dispatch({ type: 'ADD_TOAST', payload: { message: `La calificación no puede ser mayor a 10`, type: 'error' } });
                return;
            }

            dispatch({ type: 'UPDATE_GRADE', payload: { groupId: selectedGroupId, studentId, evaluationId, score: scoreValue } });
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto ml-auto">
                    <select
                        value={selectedGroupId || ''}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="w-full sm:w-64 p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary"
                    >
                        <option value="" disabled>Selecciona un grupo</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                </div>
            </div>

            {group ? (
                <>
                <div className="mb-6 bg-surface p-4 rounded-xl shadow-sm border border-border-color">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-3 gap-3">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {viewMode === 'recovery' ? (
                                <span className="text-amber-600 flex items-center gap-2"><Icon name="users" className="w-6 h-6"/> Recuperación</span>
                            ) : (
                                "Evaluaciones del Grupo"
                            )}
                        </h2>
                        
                        <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-end">
                            {/* Toggle Mode Button */}
                            <div className="bg-surface-secondary p-1 rounded-lg flex items-center border border-border-color">
                                <button 
                                    onClick={() => setViewMode('ordinary')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'ordinary' ? 'bg-white shadow text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                    Ordinario
                                </button>
                                <button 
                                    onClick={() => setViewMode('recovery')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1 ${viewMode === 'recovery' ? 'bg-amber-100 shadow text-amber-800' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                    Recuperación
                                </button>
                            </div>

                            {viewMode === 'ordinary' && (
                                <>
                                    <Button variant="secondary" onClick={() => setImageModalOpen(true)} className="flex-1 sm:flex-initial" title="Captura de Calificaciones">
                                        <Icon name="camera" className="w-4 h-4"/>
                                    </Button>
                                    <Button variant="secondary" onClick={() => setGroupConfigOpen(true)} className="flex-1 sm:flex-initial">
                                        <Icon name="settings" className="w-4 h-4"/>
                                    </Button>
                                    <Button onClick={() => { setEditingEvaluation(undefined); setEvalModalOpen(true); }} className="flex-1 sm:flex-initial">
                                        <Icon name="plus" className="w-4 h-4"/> Nueva
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                    
                     {viewMode === 'ordinary' && groupEvaluations.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {groupEvaluations.map(ev => {
                                const type = (ev.partial === 1 ? group.evaluationTypes.partial1 : group.evaluationTypes.partial2).find(t => t.id === ev.typeId);
                                return (
                                <div key={ev.id} className="bg-surface-secondary p-2 rounded-lg flex items-center gap-2">
                                    <span className="text-xs bg-accent-blue-light text-accent-blue px-1.5 py-0.5 rounded-full font-semibold">P{ev.partial}</span>
                                    <span className="font-semibold">{ev.name}</span>
                                    <span className="text-xs text-text-secondary">({type?.name || '??'})</span>
                                    <span className="text-xs bg-slate-300 dark:bg-slate-600 px-1.5 py-0.5 rounded-full">{ev.maxScore} pts</span>
                                    <button onClick={() => { setEditingEvaluation(ev); setEvalModalOpen(true); }} className="text-text-secondary hover:text-primary"><Icon name="edit-3" className="w-3 h-3"/></button>
                                    <button onClick={() => handleDeleteEvaluation(ev.id)} className="text-text-secondary hover:text-accent-red"><Icon name="x" className="w-4 h-4"/></button>
                                </div>
                            )})}
                        </div>
                    )}
                    {viewMode === 'ordinary' && groupEvaluations.length === 0 && <p className="text-text-secondary">Aún no has creado evaluaciones para este grupo.</p>}
                </div>

                <div className="bg-surface p-4 rounded-xl shadow-sm border border-border-color overflow-x-auto">
                    {/* ORDINARY TABLE */}
                    {viewMode === 'ordinary' && (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th rowSpan={2} className="sticky left-0 bg-surface p-2 text-left font-semibold z-10 border-b-2 border-border-color shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Alumno</th>
                                    {(p1Evaluations.length > 0 || p1AttendanceType) && (
                                        <th colSpan={p1Evaluations.length + (p1AttendanceType ? 1 : 0) + 1} className="p-2 font-semibold text-center text-lg border-b-2 border-border-color">Primer Parcial</th>
                                    )}
                                    {(p2Evaluations.length > 0 || p2AttendanceType) && (
                                        <th colSpan={p2Evaluations.length + (p2AttendanceType ? 1 : 0) + 1} className="p-2 font-semibold text-center text-lg border-b-2 border-border-color">Segundo Parcial</th>
                                    )}
                                    <th rowSpan={2} className="p-2 font-semibold text-center text-sm border-b-2 border-border-color bg-surface-secondary min-w-[80px]">Final</th>
                                </tr>
                                <tr className="border-b border-border-color">
                                    {p1Evaluations.map(ev => <th key={ev.id} className="p-2 font-semibold text-center text-sm min-w-[100px]">{ev.name} <span className="font-normal text-xs">({ev.maxScore}pts)</span></th>)}
                                    {p1AttendanceType && <th className="p-2 font-semibold text-center text-sm min-w-[80px] text-emerald-600">Asist.</th>}
                                    {(p1Evaluations.length > 0 || p1AttendanceType) && <th className="p-2 font-semibold text-center text-sm bg-surface-secondary/80 min-w-[60px]">Prom</th>}

                                    {p2Evaluations.map(ev => <th key={ev.id} className="p-2 font-semibold text-center text-sm min-w-[100px]">{ev.name} <span className="font-normal text-xs">({ev.maxScore}pts)</span></th>)}
                                    {p2AttendanceType && <th className="p-2 font-semibold text-center text-sm min-w-[80px] text-emerald-600">Asist.</th>}
                                    {(p2Evaluations.length > 0 || p2AttendanceType) && <th className="p-2 font-semibold text-center text-sm bg-surface-secondary/80 min-w-[60px]">Prom</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {group.students.map(student => {
                                    const p1Avg = calculatePartialAverage(group, 1, evaluations[group.id] || [], groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
                                    const p2Avg = calculatePartialAverage(group, 2, evaluations[group.id] || [], groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
                                    const p1Color = getGradeColor(p1Avg);
                                    const p2Color = getGradeColor(p2Avg);
                                    
                                    const p1AttendancePct = p1AttendanceType ? calculateAttendancePercentage(group, 1, settings, attendance[group.id]?.[student.id] || {}) : 0;
                                    const p2AttendancePct = p2AttendanceType ? calculateAttendancePercentage(group, 2, settings, attendance[group.id]?.[student.id] || {}) : 0;

                                    // For Ordinary view, Final is just average of P1 and P2
                                    let ordinaryAvg: number | null = null;
                                    if (p1Avg !== null && p2Avg !== null) {
                                        ordinaryAvg = (p1Avg + p2Avg) / 2;
                                    }
                                    const finalColor = getGradeColor(ordinaryAvg);

                                    return (
                                        <tr key={student.id} className="border-b border-border-color/70 hover:bg-surface-secondary/40">
                                            <td className="sticky left-0 bg-surface p-2 font-medium z-10 whitespace-nowrap border-r border-border-color shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{student.name}</td>
                                            
                                            {/* P1 Columns */}
                                            {p1Evaluations.map(ev => (
                                                <td key={ev.id} className="p-1 text-center">
                                                    <input type="number" value={groupGrades[student.id]?.[ev.id] ?? ''} onChange={(e) => handleGradeChange(student.id, ev.id, e.target.value)}
                                                        max={ev.maxScore} min={0} placeholder="-" className="w-16 p-1 text-center border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary text-sm"/>
                                                </td>
                                            ))}
                                            {p1AttendanceType && (
                                                <td className="p-1 text-center">
                                                     <span className="inline-block px-1.5 py-0.5 text-center bg-emerald-50 text-emerald-700 rounded-md font-semibold text-xs border border-emerald-100">
                                                        {p1AttendancePct.toFixed(0)}%
                                                     </span>
                                                </td>
                                            )}
                                            {(p1Evaluations.length > 0 || p1AttendanceType) && <td className={`p-2 text-center font-bold text-sm bg-surface-secondary/80 ${p1Color}`}>{p1Avg?.toFixed(1) || '-'}</td>}

                                            {/* P2 Columns */}
                                            {p2Evaluations.map(ev => (
                                                <td key={ev.id} className="p-1 text-center">
                                                    <input type="number" value={groupGrades[student.id]?.[ev.id] ?? ''} onChange={(e) => handleGradeChange(student.id, ev.id, e.target.value)}
                                                        max={ev.maxScore} min={0} placeholder="-" className="w-16 p-1 text-center border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary text-sm"/>
                                                </td>
                                            ))}
                                            {p2AttendanceType && (
                                                <td className="p-1 text-center">
                                                     <span className="inline-block px-1.5 py-0.5 text-center bg-emerald-50 text-emerald-700 rounded-md font-semibold text-xs border border-emerald-100">
                                                        {p2AttendancePct.toFixed(0)}%
                                                     </span>
                                                </td>
                                            )}
                                            {(p2Evaluations.length > 0 || p2AttendanceType) && <td className={`p-2 text-center font-bold text-sm bg-surface-secondary/80 ${p2Color}`}>{p2Avg?.toFixed(1) || '-'}</td>}

                                            {/* Final Definitive Score */}
                                            <td className={`p-2 text-center font-bold text-lg bg-surface-secondary ${finalColor}`}>
                                                {ordinaryAvg?.toFixed(1) || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {/* RECOVERY TABLE */}
                    {viewMode === 'recovery' && (
                        studentsForRecovery.length > 0 ? (
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100">
                                        <th rowSpan={2} className="p-3 text-left font-semibold border-b border-amber-200">Alumno</th>
                                        <th colSpan={2} className="p-2 text-center border-b border-amber-200 border-l border-amber-200">Parcial 1</th>
                                        <th colSpan={2} className="p-2 text-center border-b border-amber-200 border-l border-amber-200">Parcial 2</th>
                                        <th colSpan={3} className="p-2 text-center border-b border-amber-200 border-l border-amber-200 bg-amber-100 dark:bg-amber-900/40">Exámenes Finales</th>
                                        <th rowSpan={2} className="p-2 text-center border-b border-amber-200 font-bold bg-surface-secondary">Final</th>
                                    </tr>
                                    <tr className="bg-amber-50/50 dark:bg-amber-900/10">
                                        <th className="p-2 text-center text-xs font-semibold border-b border-amber-200 border-l border-amber-200">Prom</th>
                                        <th className="p-2 text-center text-xs font-bold text-amber-700 border-b border-amber-200">Remedial</th>
                                        
                                        <th className="p-2 text-center text-xs font-semibold border-b border-amber-200 border-l border-amber-200">Prom</th>
                                        <th className="p-2 text-center text-xs font-bold text-amber-700 border-b border-amber-200">Remedial</th>
                                        
                                        <th className="p-2 text-center text-xs font-semibold border-b border-amber-200 border-l border-amber-200">Prom Ord.</th>
                                        <th className="p-2 text-center text-xs font-bold text-amber-700 border-b border-amber-200">Extra</th>
                                        <th className="p-2 text-center text-xs font-bold text-amber-700 border-b border-amber-200">Especial</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentsForRecovery.map(student => {
                                        const p1Avg = calculatePartialAverage(group, 1, evaluations[group.id] || [], groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
                                        const p2Avg = calculatePartialAverage(group, 2, evaluations[group.id] || [], groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
                                        
                                        const remedialP1 = groupGrades[student.id]?.[GRADE_REMEDIAL_P1] ?? null;
                                        const remedialP2 = groupGrades[student.id]?.[GRADE_REMEDIAL_P2] ?? null;
                                        const extra = groupGrades[student.id]?.[GRADE_EXTRA] ?? null;
                                        const special = groupGrades[student.id]?.[GRADE_SPECIAL] ?? null;

                                        const { score: finalScore } = calculateFinalGradeWithRecovery(p1Avg, p2Avg, remedialP1, remedialP2, extra, special);
                                        const finalColor = getGradeColor(finalScore);

                                        // Enables
                                        const needsRemP1 = p1Avg !== null && p1Avg < 7;
                                        const needsRemP2 = p2Avg !== null && p2Avg < 7;
                                        
                                        // Effective grades for logic
                                        const effP1 = remedialP1 !== null ? remedialP1 : p1Avg;
                                        const effP2 = remedialP2 !== null ? remedialP2 : p2Avg;
                                        
                                        // Ordinary Avg using effective grades
                                        let ordinaryAvg: number | null = null;
                                        if (effP1 !== null && effP2 !== null) {
                                            ordinaryAvg = (effP1 + effP2) / 2;
                                        }
                                        
                                        const needsExtra = ordinaryAvg !== null && ordinaryAvg < 7;
                                        const needsSpecial = needsExtra && extra !== null && extra < 7;

                                        return (
                                            <tr key={student.id} className="border-b border-border-color/70 hover:bg-surface-secondary/40">
                                                <td className="p-3 font-medium">{student.name}</td>
                                                
                                                {/* P1 Section */}
                                                <td className={`p-2 text-center text-sm ${needsRemP1 ? 'text-accent-red font-bold' : ''}`}>
                                                    {p1Avg?.toFixed(1) || '-'}
                                                </td>
                                                <td className="p-2 text-center">
                                                    <input 
                                                        type="number" 
                                                        value={remedialP1 ?? ''} 
                                                        onChange={(e) => handleGradeChange(student.id, GRADE_REMEDIAL_P1, e.target.value)}
                                                        disabled={!needsRemP1}
                                                        max={10} min={0} 
                                                        placeholder="-"
                                                        className={`w-12 p-1 text-center border rounded-md text-sm ${needsRemP1 ? 'bg-white border-amber-300 focus:ring-2 focus:ring-amber-500' : 'bg-gray-100 border-transparent text-gray-400 cursor-not-allowed'}`}
                                                    />
                                                </td>

                                                {/* P2 Section */}
                                                <td className={`p-2 text-center text-sm border-l border-border-color ${needsRemP2 ? 'text-accent-red font-bold' : ''}`}>
                                                    {p2Avg?.toFixed(1) || '-'}
                                                </td>
                                                <td className="p-2 text-center">
                                                    <input 
                                                        type="number" 
                                                        value={remedialP2 ?? ''} 
                                                        onChange={(e) => handleGradeChange(student.id, GRADE_REMEDIAL_P2, e.target.value)}
                                                        disabled={!needsRemP2}
                                                        max={10} min={0} 
                                                        placeholder="-"
                                                        className={`w-12 p-1 text-center border rounded-md text-sm ${needsRemP2 ? 'bg-white border-amber-300 focus:ring-2 focus:ring-amber-500' : 'bg-gray-100 border-transparent text-gray-400 cursor-not-allowed'}`}
                                                    />
                                                </td>

                                                {/* Finals Section */}
                                                <td className={`p-2 text-center text-sm border-l border-border-color font-semibold ${needsExtra ? 'text-accent-red' : 'text-accent-green-dark'}`}>
                                                    {ordinaryAvg?.toFixed(1) || '-'}
                                                </td>
                                                <td className="p-2 text-center">
                                                    <input 
                                                        type="number" 
                                                        value={extra ?? ''} 
                                                        onChange={(e) => handleGradeChange(student.id, GRADE_EXTRA, e.target.value)}
                                                        disabled={!needsExtra}
                                                        max={10} min={0} 
                                                        placeholder="-"
                                                        className={`w-12 p-1 text-center border rounded-md text-sm ${needsExtra ? 'bg-white border-amber-300 focus:ring-2 focus:ring-amber-500' : 'bg-gray-100 border-transparent text-gray-400 cursor-not-allowed'}`}
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <input 
                                                        type="number" 
                                                        value={special ?? ''} 
                                                        onChange={(e) => handleGradeChange(student.id, GRADE_SPECIAL, e.target.value)}
                                                        disabled={!needsSpecial}
                                                        max={10} min={0} 
                                                        placeholder="-"
                                                        className={`w-12 p-1 text-center border rounded-md text-sm ${needsSpecial ? 'bg-white border-amber-300 focus:ring-2 focus:ring-amber-500' : 'bg-gray-100 border-transparent text-gray-400 cursor-not-allowed'}`}
                                                    />
                                                </td>

                                                {/* Definitive */}
                                                <td className={`p-2 text-center font-bold text-lg bg-surface-secondary border-l border-border-color ${finalColor}`}>
                                                    {finalScore?.toFixed(1) || '-'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-10 flex flex-col items-center">
                                <div className="p-4 bg-green-100 text-green-700 rounded-full mb-3">
                                    <Icon name="check-circle-2" className="w-8 h-8"/>
                                </div>
                                <p className="text-lg font-semibold text-text-primary">¡Excelente!</p>
                                <p className="text-text-secondary">No hay alumnos reprobados que necesiten recuperación.</p>
                            </div>
                        )
                    )}

                     {group.students.length === 0 && <p className="text-center text-text-secondary py-8">No hay alumnos en este grupo.</p>}
                </div>
                </>
            ) : (
                 <div className="text-center py-20 bg-surface rounded-xl shadow-sm border border-border-color">
                    <Icon name="graduation-cap" className="w-20 h-20 mx-auto text-border-color"/>
                    <p className="mt-4 text-text-secondary">Por favor, selecciona un grupo para registrar calificaciones.</p>
                    {groups.length === 0 && <p className="text-text-secondary/70">Primero necesitas crear un grupo en la sección 'Grupos'.</p>}
                </div>
            )}
            {group && <Modal isOpen={isEvalModalOpen} onClose={() => setEvalModalOpen(false)} title={editingEvaluation ? 'Editar Evaluación' : 'Nueva Evaluación'} size="lg">
                <EvaluationForm evaluation={editingEvaluation} group={group} onSave={handleSaveEvaluation} onCancel={() => setEvalModalOpen(false)} />
            </Modal>}
            {group && <Modal isOpen={isGroupConfigOpen} onClose={() => setGroupConfigOpen(false)} title="Configuración del Grupo" size="xl">
                <GroupForm group={group} existingGroups={groups} onSave={handleUpdateGroup} onCancel={() => setGroupConfigOpen(false)} />
            </Modal>}
            {group && <GradeImageModal 
                isOpen={isImageModalOpen} 
                onClose={() => setImageModalOpen(false)} 
                group={group}
                evaluations={groupEvaluations}
                grades={groupGrades}
                attendance={attendance[group.id] || {}}
                settings={settings}
            />}
        </div>
    );
};

export default GradesView;