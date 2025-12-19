
import React, { useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import { Evaluation, Group } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import { GroupForm } from './GroupManagement';
import { calculatePartialAverage, getGradeColor, calculateFinalGradeWithRecovery } from '../services/gradeCalculation';
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
    const [isTeamBased, setIsTeamBased] = useState(evaluation?.isTeamBased || false);
    
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
            alert('Por favor, completa todos los campos.');
            return;
        }
        onSave({ id: evaluation?.id || uuidv4(), name, maxScore, partial, typeId, isTeamBased });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="evalName" className="block text-sm font-medium">Nombre de la Evaluación</label>
                    <input type="text" id="evalName" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full p-2 border border-border-color rounded-md bg-surface" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="maxScore" className="block text-sm font-medium">Puntuación Máxima</label>
                        <input type="number" id="maxScore" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} min="1" required className="mt-1 block w-full p-2 border border-border-color rounded-md bg-surface" />
                    </div>
                    <div>
                        <label htmlFor="partial" className="block text-sm font-medium">Parcial</label>
                        <select id="partial" value={partial} onChange={e => setPartial(Number(e.target.value) as 1 | 2)} className="mt-1 block w-full p-2 border border-border-color rounded-md bg-surface">
                            <option value={1}>Primer Parcial</option>
                            <option value={2}>Segundo Parcial</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor="typeId" className="block text-sm font-medium">Tipo de Evaluación</label>
                    <select id="typeId" value={typeId} onChange={e => setTypeId(e.target.value)} className="mt-1 block w-full p-2 border border-border-color rounded-md bg-surface">
                        {availableTypes.map(type => <option key={type.id} value={type.id}>{type.name} ({type.weight}%)</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                    <input 
                        type="checkbox" 
                        id="isTeamBased" 
                        checked={isTeamBased} 
                        onChange={e => setIsTeamBased(e.target.checked)}
                        className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="isTeamBased" className="text-sm font-bold text-indigo-700 dark:text-indigo-400 cursor-pointer">
                        ¿Evaluación por EQUIPOS? <span className="font-normal block text-xs opacity-80">La calificación se compartirá con todos los integrantes del mismo equipo.</span>
                    </label>
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">Guardar Evaluación</Button>
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
        if (!selectedGroupId && groups.length > 0) setSelectedGroupId(groups[0].id);
    }, [groups, selectedGroupId, setSelectedGroupId]);
    
    const studentsForRecovery = useMemo(() => {
        if (!group) return [];
        return group.students.filter(student => {
            const p1Avg = calculatePartialAverage(group, 1, groupEvaluations, groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
            const p2Avg = calculatePartialAverage(group, 2, groupEvaluations, groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
            const r1 = groupGrades[student.id]?.[GRADE_REMEDIAL_P1] ?? null;
            const r2 = groupGrades[student.id]?.[GRADE_REMEDIAL_P2] ?? null;
            const extra = groupGrades[student.id]?.[GRADE_EXTRA] ?? null;
            const special = groupGrades[student.id]?.[GRADE_SPECIAL] ?? null;
            const { isFailing } = calculateFinalGradeWithRecovery(p1Avg, p2Avg, r1, r2, extra, special);
            return isFailing || (p1Avg !== null && p1Avg < 7) || (p2Avg !== null && p2Avg < 7);
        });
    }, [group, groupEvaluations, groupGrades, settings, attendance]);

    const handleGradeChange = (studentId: string, evaluationId: string, score: string) => {
        if (selectedGroupId) {
            const scoreValue = score === '' ? null : parseFloat(score);
            dispatch({ type: 'UPDATE_GRADE', payload: { groupId: selectedGroupId, studentId, evaluationId, score: scoreValue } });
        }
    };

    return (
        <div>
            <div className="flex justify-end mb-6">
                <select value={selectedGroupId || ''} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-full sm:w-64 p-2 border border-border-color rounded-md bg-surface">
                    <option value="" disabled>Selecciona un grupo</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </div>

            {group ? (
                <>
                <div className="mb-6 bg-surface p-4 rounded-xl shadow-sm border border-border-color">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-3 gap-3">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {viewMode === 'recovery' ? <span className="text-amber-600 flex items-center gap-2"><Icon name="users" /> Recuperación</span> : "Calificaciones"}
                        </h2>
                        <div className="flex flex-wrap gap-3">
                            <div className="bg-surface-secondary p-1 rounded-lg flex border border-border-color">
                                <button onClick={() => setViewMode('ordinary')} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${viewMode === 'ordinary' ? 'bg-white shadow text-primary' : 'text-text-secondary'}`}>Ordinario</button>
                                <button onClick={() => setViewMode('recovery')} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${viewMode === 'recovery' ? 'bg-amber-100 shadow text-amber-800' : 'text-text-secondary'}`}>Recuperación</button>
                            </div>
                            {viewMode === 'ordinary' && (
                                <>
                                    <Button variant="secondary" onClick={() => setImageModalOpen(true)} title="Captura de Calificaciones">
                                        <Icon name="camera" className="w-4 h-4"/>
                                    </Button>
                                    <Button variant="secondary" onClick={() => setGroupConfigOpen(true)}>
                                        <Icon name="settings" className="w-4 h-4"/>
                                    </Button>
                                    <Button onClick={() => { setEditingEvaluation(undefined); setEvalModalOpen(true); }}><Icon name="plus" className="w-4 h-4"/> Nueva</Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-surface p-4 rounded-xl shadow-sm border border-border-color overflow-x-auto">
                    {viewMode === 'ordinary' ? (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th rowSpan={2} className="sticky left-0 bg-surface p-2 text-left font-semibold z-10 border-b-2 border-border-color">Alumno</th>
                                    <th rowSpan={2} className="p-2 font-semibold text-center border-b-2 border-border-color text-xs text-text-secondary">Eq.</th>
                                    {p1Evaluations.map(ev => <th key={ev.id} className="p-2 font-semibold text-center text-xs border-b-2 border-border-color">
                                        <div className="flex flex-col items-center">
                                            {ev.isTeamBased && <Icon name="users" className="w-3 h-3 text-indigo-500 mb-1" />}
                                            <span className="truncate max-w-[80px]">{ev.name}</span>
                                        </div>
                                    </th>)}
                                    {p1AttendanceType && <th className="p-2 font-semibold text-center border-b-2 border-border-color text-xs text-emerald-600">Asist.</th>}
                                    <th className="p-2 font-semibold text-center border-b-2 border-border-color bg-surface-secondary text-xs">P1</th>
                                    {p2Evaluations.map(ev => <th key={ev.id} className="p-2 font-semibold text-center text-xs border-b-2 border-border-color">
                                        <div className="flex flex-col items-center">
                                            {ev.isTeamBased && <Icon name="users" className="w-3 h-3 text-indigo-500 mb-1" />}
                                            <span className="truncate max-w-[80px]">{ev.name}</span>
                                        </div>
                                    </th>)}
                                    {p2AttendanceType && <th className="p-2 font-semibold text-center border-b-2 border-border-color text-xs text-emerald-600">Asist.</th>}
                                    <th className="p-2 font-semibold text-center border-b-2 border-border-color bg-surface-secondary text-xs">P2</th>
                                </tr>
                            </thead>
                            <tbody>
                                {group.students.map(student => {
                                    const p1Avg = calculatePartialAverage(group, 1, groupEvaluations, groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
                                    const p2Avg = calculatePartialAverage(group, 2, groupEvaluations, groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
                                    return (
                                        <tr key={student.id} className="border-b border-border-color/70 hover:bg-surface-secondary/40">
                                            <td className="sticky left-0 bg-surface p-2 font-medium z-10 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {student.name}
                                                    {student.isRepeating && <span className="bg-rose-600 text-white text-[9px] font-bold px-1 rounded-full">R</span>}
                                                </div>
                                            </td>
                                            <td className="p-1 text-center text-[10px] text-indigo-600 font-bold">{student.team || '-'}</td>
                                            {p1Evaluations.map(ev => (
                                                <td key={ev.id} className="p-1 text-center">
                                                    <input type="number" value={groupGrades[student.id]?.[ev.id] ?? ''} onChange={(e) => handleGradeChange(student.id, ev.id, e.target.value)}
                                                        className={`w-12 p-1 text-center border border-border-color rounded-md bg-surface text-xs ${ev.isTeamBased ? 'border-indigo-300 ring-1 ring-indigo-100' : ''}`}/>
                                                </td>
                                            ))}
                                            {p1AttendanceType && <td className="p-1 text-center text-[10px] text-emerald-600">✔</td>}
                                            <td className={`p-2 text-center font-bold text-xs bg-surface-secondary ${getGradeColor(p1Avg)}`}>{p1Avg?.toFixed(1) || '-'}</td>
                                            {p2Evaluations.map(ev => (
                                                <td key={ev.id} className="p-1 text-center">
                                                    <input type="number" value={groupGrades[student.id]?.[ev.id] ?? ''} onChange={(e) => handleGradeChange(student.id, ev.id, e.target.value)}
                                                        className={`w-12 p-1 text-center border border-border-color rounded-md bg-surface text-xs ${ev.isTeamBased ? 'border-indigo-300 ring-1 ring-indigo-100' : ''}`}/>
                                                </td>
                                            ))}
                                            {p2AttendanceType && <td className="p-1 text-center text-[10px] text-emerald-600">✔</td>}
                                            <td className={`p-2 text-center font-bold text-xs bg-surface-secondary ${getGradeColor(p2Avg)}`}>{p2Avg?.toFixed(1) || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100">
                                    <th className="p-2 text-left font-semibold border-b border-amber-200">Alumno</th>
                                    <th className="p-2 text-center border-b border-amber-200">Rem P1</th>
                                    <th className="p-2 text-center border-b border-amber-200">Rem P2</th>
                                    <th className="p-2 text-center border-b border-amber-200">Extra</th>
                                    <th className="p-2 text-center border-b border-amber-200">Especial</th>
                                    <th className="p-2 text-center border-b border-amber-200 font-bold">Final</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentsForRecovery.map(student => {
                                    const p1Avg = calculatePartialAverage(group, 1, groupEvaluations, groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
                                    const p2Avg = calculatePartialAverage(group, 2, groupEvaluations, groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
                                    
                                    const r1 = groupGrades[student.id]?.[GRADE_REMEDIAL_P1] ?? null;
                                    const r2 = groupGrades[student.id]?.[GRADE_REMEDIAL_P2] ?? null;
                                    const extra = groupGrades[student.id]?.[GRADE_EXTRA] ?? null;
                                    const special = groupGrades[student.id]?.[GRADE_SPECIAL] ?? null;

                                    const { score: finalScore } = calculateFinalGradeWithRecovery(p1Avg, p2Avg, r1, r2, extra, special);

                                    return (
                                        <tr key={student.id} className="border-b border-border-color/70 hover:bg-surface-secondary/40">
                                            <td className="p-2 font-medium">
                                                {student.name}
                                            </td>
                                            <td className="p-1 text-center">
                                                <input type="number" value={r1 ?? ''} onChange={(e) => handleGradeChange(student.id, GRADE_REMEDIAL_P1, e.target.value)}
                                                    className="w-12 p-1 text-center border border-amber-300 rounded-md bg-surface text-xs"/>
                                            </td>
                                            <td className="p-1 text-center">
                                                <input type="number" value={r2 ?? ''} onChange={(e) => handleGradeChange(student.id, GRADE_REMEDIAL_P2, e.target.value)}
                                                    className="w-12 p-1 text-center border border-amber-300 rounded-md bg-surface text-xs"/>
                                            </td>
                                            <td className="p-1 text-center">
                                                <input type="number" value={extra ?? ''} onChange={(e) => handleGradeChange(student.id, GRADE_EXTRA, e.target.value)}
                                                    className="w-12 p-1 text-center border border-amber-400 rounded-md bg-surface text-xs"/>
                                            </td>
                                            <td className="p-1 text-center">
                                                <input type="number" value={special ?? ''} onChange={(e) => handleGradeChange(student.id, GRADE_SPECIAL, e.target.value)}
                                                    className="w-12 p-1 text-center border border-amber-500 rounded-md bg-surface text-xs"/>
                                            </td>
                                            <td className={`p-2 text-center font-bold text-sm bg-surface-secondary ${getGradeColor(finalScore)}`}>
                                                {finalScore?.toFixed(1) || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
                </>
            ) : <div className="text-center py-20">Selecciona un grupo.</div>}
            
            {group && (
                <>
                    <Modal isOpen={isEvalModalOpen} onClose={() => setEvalModalOpen(false)} title={editingEvaluation ? 'Editar Evaluación' : 'Nueva Evaluación'}>
                        <EvaluationForm evaluation={editingEvaluation} group={group} onSave={(evaluation) => { dispatch({ type: 'SAVE_EVALUATION', payload: { groupId: group.id, evaluation } }); setEvalModalOpen(false); }} onCancel={() => setEvalModalOpen(false)} />
                    </Modal>
                    <Modal isOpen={isGroupConfigOpen} onClose={() => setGroupConfigOpen(false)} title="Configuración del Grupo" size="xl">
                        <GroupForm group={group} existingGroups={groups} onSave={(updatedGroup) => { dispatch({ type: 'SAVE_GROUP', payload: updatedGroup }); setGroupConfigOpen(false); }} onCancel={() => setGroupConfigOpen(false)} />
                    </Modal>
                    <GradeImageModal 
                        isOpen={isImageModalOpen} 
                        onClose={() => setImageModalOpen(false)} 
                        group={group}
                        evaluations={groupEvaluations}
                        grades={groupGrades}
                        attendance={attendance[group.id] || {}}
                        settings={settings}
                    />
                </>
            )}
        </div>
    );
};

export default GradesView;
