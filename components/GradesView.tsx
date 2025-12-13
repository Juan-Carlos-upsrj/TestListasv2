import React, { useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import { Evaluation, Group } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import { GroupForm } from './GroupManagement';
import { calculatePartialAverage, getGradeColor, calculateAttendancePercentage } from '../services/gradeCalculation';
import GradeImageModal from './GradeImageModal';

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
            if (evaluation && scoreValue !== null && (scoreValue < 0 || scoreValue > evaluation.maxScore)) {
                dispatch({ type: 'ADD_TOAST', payload: { message: `La calificación no puede ser mayor a ${evaluation.maxScore}`, type: 'error' } });
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
                        <h2 className="text-xl font-bold">Evaluaciones del Grupo</h2>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button variant="secondary" onClick={() => setImageModalOpen(true)} className="flex-1 sm:flex-initial" title="Captura de Calificaciones">
                                <Icon name="camera" className="w-4 h-4"/>
                            </Button>
                            <Button variant="secondary" onClick={() => setGroupConfigOpen(true)} className="flex-1 sm:flex-initial">
                                <Icon name="settings" className="w-4 h-4"/> Configurar Grupo
                            </Button>
                            <Button onClick={() => { setEditingEvaluation(undefined); setEvalModalOpen(true); }} className="flex-1 sm:flex-initial">
                                <Icon name="plus" className="w-4 h-4"/> Nueva Evaluación
                            </Button>
                        </div>
                    </div>
                     {groupEvaluations.length > 0 ? (
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
                    ) : <p className="text-text-secondary">Aún no has creado evaluaciones para este grupo.</p>}
                    
                    {(p1AttendanceType || p2AttendanceType) && (
                        <div className="mt-4 pt-3 border-t border-border-color">
                            <p className="text-sm font-semibold text-text-secondary mb-2">Criterios de Asistencia Automática:</p>
                            <div className="flex gap-3">
                                {p1AttendanceType && (
                                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full border border-emerald-200">
                                        Parcial 1: {p1AttendanceType.weight}%
                                    </span>
                                )}
                                {p2AttendanceType && (
                                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full border border-emerald-200">
                                        Parcial 2: {p2AttendanceType.weight}%
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-surface p-4 rounded-xl shadow-sm border border-border-color overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th rowSpan={2} className="sticky left-0 bg-surface p-2 text-left font-semibold z-10 border-b-2 border-border-color">Alumno</th>
                                {(p1Evaluations.length > 0 || p1AttendanceType) && (
                                    <th colSpan={p1Evaluations.length + (p1AttendanceType ? 1 : 0) + 1} className="p-2 font-semibold text-center text-lg border-b-2 border-border-color">Primer Parcial</th>
                                )}
                                {(p2Evaluations.length > 0 || p2AttendanceType) && (
                                    <th colSpan={p2Evaluations.length + (p2AttendanceType ? 1 : 0) + 1} className="p-2 font-semibold text-center text-lg border-b-2 border-border-color">Segundo Parcial</th>
                                )}
                                <th rowSpan={2} className="p-2 font-semibold text-center text-sm border-b-2 border-border-color bg-surface-secondary min-w-[100px]">Promedio Final</th>
                            </tr>
                            <tr className="border-b border-border-color">
                                {p1Evaluations.map(ev => <th key={ev.id} className="p-2 font-semibold text-center text-sm min-w-[100px]">{ev.name} <span className="font-normal text-xs">({ev.maxScore}pts)</span></th>)}
                                {p1AttendanceType && <th className="p-2 font-semibold text-center text-sm min-w-[100px] text-emerald-600">Asistencia <span className="font-normal text-xs">({p1AttendanceType.weight}%)</span></th>}
                                {(p1Evaluations.length > 0 || p1AttendanceType) && <th className="p-2 font-semibold text-center text-sm bg-surface-secondary/80 min-w-[100px]">Prom. P1</th>}

                                {p2Evaluations.map(ev => <th key={ev.id} className="p-2 font-semibold text-center text-sm min-w-[100px]">{ev.name} <span className="font-normal text-xs">({ev.maxScore}pts)</span></th>)}
                                {p2AttendanceType && <th className="p-2 font-semibold text-center text-sm min-w-[100px] text-emerald-600">Asistencia <span className="font-normal text-xs">({p2AttendanceType.weight}%)</span></th>}
                                {(p2Evaluations.length > 0 || p2AttendanceType) && <th className="p-2 font-semibold text-center text-sm bg-surface-secondary/80 min-w-[100px]">Prom. P2</th>}
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

                                let finalAvg: number | null = null;
                                if (p1Avg !== null && p2Avg !== null) {
                                    finalAvg = (p1Avg + p2Avg) / 2;
                                } else if (p1Avg !== null) {
                                    finalAvg = p1Avg;
                                } else if (p2Avg !== null) {
                                    finalAvg = p2Avg;
                                }
                                const finalColor = getGradeColor(finalAvg);

                                return (
                                    <tr key={student.id} className="border-b border-border-color/70 hover:bg-surface-secondary/40">
                                        <td className="sticky left-0 bg-surface p-2 font-medium z-10 whitespace-nowrap">{student.name}</td>
                                        
                                        {p1Evaluations.map(ev => (
                                            <td key={ev.id} className="p-1 text-center">
                                                <input type="number" value={groupGrades[student.id]?.[ev.id] ?? ''} onChange={(e) => handleGradeChange(student.id, ev.id, e.target.value)}
                                                    max={ev.maxScore} min={0} placeholder="-" className="w-20 p-1.5 text-center border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary"/>
                                            </td>
                                        ))}
                                        {p1AttendanceType && (
                                            <td className="p-1 text-center">
                                                 <span className="inline-block w-20 p-1.5 text-center bg-emerald-50 text-emerald-700 rounded-md font-semibold text-sm border border-emerald-100">
                                                    {p1AttendancePct.toFixed(0)}%
                                                 </span>
                                            </td>
                                        )}
                                        {(p1Evaluations.length > 0 || p1AttendanceType) && <td className={`p-2 text-center font-bold text-lg bg-surface-secondary/80 ${p1Color}`}>{p1Avg?.toFixed(1) || '-'}</td>}

                                        {p2Evaluations.map(ev => (
                                            <td key={ev.id} className="p-1 text-center">
                                                <input type="number" value={groupGrades[student.id]?.[ev.id] ?? ''} onChange={(e) => handleGradeChange(student.id, ev.id, e.target.value)}
                                                    max={ev.maxScore} min={0} placeholder="-" className="w-20 p-1.5 text-center border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary"/>
                                            </td>
                                        ))}
                                        {p2AttendanceType && (
                                            <td className="p-1 text-center">
                                                 <span className="inline-block w-20 p-1.5 text-center bg-emerald-50 text-emerald-700 rounded-md font-semibold text-sm border border-emerald-100">
                                                    {p2AttendancePct.toFixed(0)}%
                                                 </span>
                                            </td>
                                        )}
                                        {(p2Evaluations.length > 0 || p2AttendanceType) && <td className={`p-2 text-center font-bold text-lg bg-surface-secondary/80 ${p2Color}`}>{p2Avg?.toFixed(1) || '-'}</td>}

                                        <td className={`p-2 text-center font-bold text-xl bg-surface-secondary ${finalColor}`}>{finalAvg?.toFixed(1) || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
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