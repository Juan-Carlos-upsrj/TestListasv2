import React, { useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import { Evaluation, Group } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import ConfirmationModal from './common/ConfirmationModal';
import { GroupForm } from './GroupManagement';
import { calculatePartialAverage, getGradeColor, calculateFinalGradeWithRecovery } from '../services/gradeCalculation';
import GradeImageModal from './GradeImageModal';

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
                    <input type="checkbox" id="isTeamBased" checked={isTeamBased} onChange={e => setIsTeamBased(e.target.checked)} className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500"/>
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
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmDeleteEval, setConfirmDeleteEval] = useState<Evaluation | null>(null);

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

    useEffect(() => { if (!selectedGroupId && groups.length > 0) setSelectedGroupId(groups[0].id); }, [groups, selectedGroupId, setSelectedGroupId]);
    
    const filteredStudents = useMemo(() => {
        if (!group) return [];
        const term = searchTerm.toLowerCase();
        return group.students.filter(s => 
            s.name.toLowerCase().includes(term) || 
            (s.matricula && s.matricula.toLowerCase().includes(term))
        );
    }, [group, searchTerm]);

    const studentsForRecovery = useMemo(() => {
        return filteredStudents.filter(student => {
            const p1Avg = calculatePartialAverage(group!, 1, groupEvaluations, groupGrades[student.id] || {}, settings, attendance[group!.id]?.[student.id] || {});
            const p2Avg = calculatePartialAverage(group!, 2, groupEvaluations, groupGrades[student.id] || {}, settings, attendance[group!.id]?.[student.id] || {});
            const r1 = groupGrades[student.id]?.[GRADE_REMEDIAL_P1] ?? null, r2 = groupGrades[student.id]?.[GRADE_REMEDIAL_P2] ?? null;
            const extra = groupGrades[student.id]?.[GRADE_EXTRA] ?? null, special = groupGrades[student.id]?.[GRADE_SPECIAL] ?? null;
            const { isFailing } = calculateFinalGradeWithRecovery(p1Avg, p2Avg, r1, r2, extra, special);
            return isFailing || (p1Avg !== null && p1Avg < 7) || (p2Avg !== null && p2Avg < 7);
        });
    }, [group, filteredStudents, groupEvaluations, groupGrades, settings, attendance]);

    const handleGradeChange = (studentId: string, evaluationId: string, score: string) => {
        if (selectedGroupId) {
            const scoreValue = score === '' ? null : parseFloat(score);
            dispatch({ type: 'UPDATE_GRADE', payload: { groupId: selectedGroupId, studentId, evaluationId, score: scoreValue } });
        }
    };

    const deleteEvaluationAction = () => {
        if (confirmDeleteEval && selectedGroupId) {
            dispatch({ type: 'DELETE_EVALUATION', payload: { groupId: selectedGroupId, evaluationId: confirmDeleteEval.id } });
            setConfirmDeleteEval(null);
        }
    };

    const handleEditEvaluation = (evaluation: Evaluation) => {
        setEditingEvaluation(evaluation);
        setEvalModalOpen(true);
    };

    const toggleTeamsVisibility = () => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: { showTeamsInGrades: !settings.showTeamsInGrades } });
    };

    const renderHeaderButtons = (ev: Evaluation) => (
        <div className="flex flex-col items-center justify-center p-2 relative group w-full">
            <div className="absolute top-0 right-0 flex sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/80 rounded-md shadow-sm z-10">
                <button onClick={() => handleEditEvaluation(ev)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><Icon name="edit-3" className="w-3 h-3"/></button>
                <button onClick={() => setConfirmDeleteEval(ev)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Borrar"><Icon name="trash-2" className="w-3 h-3"/></button>
            </div>
            {ev.isTeamBased && <Icon name="users" className="w-3 h-3 text-indigo-500 mb-0.5" />}
            <span className="text-[10px] font-bold leading-tight line-clamp-2 px-1 text-center" title={ev.name}>{ev.name}</span>
            <span className="text-[9px] opacity-60 font-normal">({ev.maxScore} pts)</span>
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="bg-surface p-3 mb-4 rounded-xl border border-border-color shadow-sm flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <select value={selectedGroupId || ''} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-full sm:w-56 p-2 border border-border-color rounded-md bg-white text-sm focus:ring-2 focus:ring-primary">
                        <option value="" disabled>Selecciona un grupo</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Icon name="search" className="h-4 w-4" />
                        </div>
                        <input 
                            type="text" 
                            className="block w-full pl-9 pr-3 py-2 border border-border-color rounded-md bg-white text-sm focus:ring-1 focus:ring-primary" 
                            placeholder="Buscar alumno..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>

                    <div className="flex-grow flex flex-wrap gap-2 justify-end">
                        <div className="bg-surface-secondary p-1 rounded-lg flex border border-border-color">
                            <button onClick={() => setViewMode('ordinary')} className={`px-2 py-1.5 rounded-md text-xs font-bold ${viewMode === 'ordinary' ? 'bg-white shadow text-primary' : 'text-text-secondary'}`}>Ordinario</button>
                            <button onClick={() => setViewMode('recovery')} className={`px-2 py-1.5 rounded-md text-xs font-bold ${viewMode === 'recovery' ? 'bg-amber-100 shadow text-amber-800' : 'text-text-secondary'}`}>Recuperación</button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-color pt-3">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                             <button 
                                onClick={toggleTeamsVisibility}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${settings.showTeamsInGrades ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-surface border-border-color text-text-secondary'}`}
                            >
                                <Icon name="users" className="w-4 h-4"/>
                                {settings.showTeamsInGrades ? 'Equipos: ON' : 'Equipos: OFF'}
                            </button>
                        </div>
                        <span className="text-xs text-text-secondary font-medium">Resultados: {viewMode === 'ordinary' ? filteredStudents.length : studentsForRecovery.length}</span>
                    </div>

                    {viewMode === 'ordinary' && (
                        <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setImageModalOpen(true)} title="Captura de Calificaciones"><Icon name="camera" className="w-4 h-4"/></Button>
                            <Button variant="secondary" size="sm" onClick={() => setGroupConfigOpen(true)} title="Criterios"><Icon name="settings" className="w-4 h-4"/></Button>
                            <Button size="sm" onClick={() => { setEditingEvaluation(undefined); setEvalModalOpen(true); }}><Icon name="plus" className="w-4 h-4"/> <span className="hidden sm:inline ml-1">Nueva Evaluación</span></Button>
                        </div>
                    )}
                </div>
            </div>

            {group ? (
                <div className="flex-1 bg-surface rounded-xl border border-border-color shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-auto flex-1 custom-scrollbar">
                        {viewMode === 'ordinary' ? (
                            <table className="w-full border-collapse text-xs">
                                <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                                    <tr>
                                        <th rowSpan={2} className="sticky left-0 bg-slate-50 p-3 text-left font-bold border-b border-r border-slate-200 z-30 min-w-max">Alumno</th>
                                        {settings.showTeamsInGrades && (
                                            <th rowSpan={2} className="p-2 font-bold text-center border-b border-r border-slate-200 bg-slate-100 text-[10px]">Eq.</th>
                                        )}
                                        <th colSpan={p1Evaluations.length + (p1AttendanceType ? 1 : 0) + 1} className="p-1.5 font-bold text-center border-b border-r border-slate-200 bg-indigo-50 text-indigo-700">Primer Parcial</th>
                                        <th colSpan={p2Evaluations.length + (p2AttendanceType ? 1 : 0) + 1} className="p-1.5 font-bold text-center border-b border-slate-200 bg-blue-50 text-blue-700">Segundo Parcial</th>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        {p1Evaluations.map(ev => <th key={ev.id} className="border-b border-r border-slate-200 min-w-max">{renderHeaderButtons(ev)}</th>)}
                                        {p1AttendanceType && <th className="p-2 font-bold text-center border-b border-r border-slate-200 text-emerald-600">Asist.</th>}
                                        <th className="p-2 font-bold text-center border-b border-r border-slate-200 bg-indigo-100/50 text-indigo-800">PROM</th>
                                        {p2Evaluations.map(ev => <th key={ev.id} className="border-b border-r border-slate-200 min-w-max">{renderHeaderButtons(ev)}</th>)}
                                        {p2AttendanceType && <th className="p-2 font-bold text-center border-b border-r border-slate-200 text-emerald-600">Asist.</th>}
                                        <th className="p-2 font-bold text-center border-b bg-blue-100/50 text-blue-800">PROM</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student, idx) => {
                                        const p1Avg = calculatePartialAverage(group, 1, groupEvaluations, groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
                                        const p2Avg = calculatePartialAverage(group, 2, groupEvaluations, groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
                                        return (
                                            <tr key={student.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} border-b border-slate-100 hover:bg-indigo-50/20`}>
                                                <td className="sticky left-0 bg-inherit p-2.5 font-medium border-r border-slate-100 z-10 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] text-slate-400 w-4 inline-block text-right">{idx + 1}.</span>
                                                        <span className="font-bold">{student.name}</span>
                                                        {student.isRepeating && <span className="bg-rose-600 text-white text-[8px] font-bold px-1 rounded-full shrink-0">R</span>}
                                                    </div>
                                                </td>
                                                {settings.showTeamsInGrades && (
                                                    <td className="p-1 text-center font-bold text-indigo-600 border-r border-slate-100">{student.team || '-'}</td>
                                                )}
                                                {p1Evaluations.map(ev => (
                                                    <td key={ev.id} className="p-1 border-r border-slate-100">
                                                        <input type="number" step="0.1" value={groupGrades[student.id]?.[ev.id] ?? ''} onChange={(e) => handleGradeChange(student.id, ev.id, e.target.value)} className="w-full max-w-[50px] mx-auto block bg-transparent text-center focus:ring-1 focus:ring-primary rounded py-1" placeholder="-"/>
                                                    </td>
                                                ))}
                                                {p1AttendanceType && <td className="p-1 text-center text-emerald-600 border-r border-slate-100">✔</td>}
                                                <td className={`p-2 text-center font-bold border-r border-slate-100 bg-slate-50/50 ${getGradeColor(p1Avg)}`}>{p1Avg?.toFixed(1) || '-'}</td>
                                                {p2Evaluations.map(ev => (
                                                    <td key={ev.id} className="p-1 border-r border-slate-100">
                                                        <input type="number" step="0.1" value={groupGrades[student.id]?.[ev.id] ?? ''} onChange={(e) => handleGradeChange(student.id, ev.id, e.target.value)} className="w-full max-w-[50px] mx-auto block bg-transparent text-center focus:ring-1 focus:ring-primary rounded py-1" placeholder="-"/>
                                                    </td>
                                                ))}
                                                {p2AttendanceType && <td className="p-1 text-center text-emerald-600 border-r border-slate-100">✔</td>}
                                                <td className={`p-2 text-center font-bold bg-slate-50/50 ${getGradeColor(p2Avg)}`}>{p2Avg?.toFixed(1) || '-'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full border-collapse text-xs">
                                <thead className="sticky top-0 z-20 bg-amber-50 shadow-sm font-bold">
                                    <tr className="text-amber-900 border-b border-amber-200">
                                        <th className="p-3 text-left">Alumno</th>
                                        <th className="p-2 text-center">Rem P1</th>
                                        <th className="p-2 text-center">Rem P2</th>
                                        <th className="p-2 text-center">Extra</th>
                                        <th className="p-2 text-center">Especial</th>
                                        <th className="p-2 text-center bg-amber-100/50">FINAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentsForRecovery.map((student, idx) => {
                                        const p1Avg = calculatePartialAverage(group, 1, groupEvaluations, groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
                                        const p2Avg = calculatePartialAverage(group, 2, groupEvaluations, groupGrades[student.id] || {}, settings, attendance[group.id]?.[student.id] || {});
                                        const r1 = groupGrades[student.id]?.[GRADE_REMEDIAL_P1] ?? null, r2 = groupGrades[student.id]?.[GRADE_REMEDIAL_P2] ?? null;
                                        const extra = groupGrades[student.id]?.[GRADE_EXTRA] ?? null, special = groupGrades[student.id]?.[GRADE_SPECIAL] ?? null;
                                        const { score: finalScore, isFailing } = calculateFinalGradeWithRecovery(p1Avg, p2Avg, r1, r2, extra, special);
                                        const canTakeExtra = ((r1 !== null ? r1 : p1Avg) || 0) < 7 || ((r2 !== null ? r2 : p2Avg) || 0) < 7 || isFailing;
                                        return (
                                            <tr key={student.id} className={`border-b border-amber-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}`}>
                                                <td className="p-2.5 font-bold whitespace-nowrap">
                                                    {student.name} {student.isRepeating && <span className="bg-rose-600 text-white text-[8px] font-bold px-1 rounded-full">R</span>}
                                                </td>
                                                <td className="p-1 text-center"><input type="number" value={r1 ?? ''} onChange={(e) => handleGradeChange(student.id, GRADE_REMEDIAL_P1, e.target.value)} className="w-12 text-center border-amber-200 focus:ring-amber-500 rounded py-1"/></td>
                                                <td className="p-1 text-center"><input type="number" value={r2 ?? ''} onChange={(e) => handleGradeChange(student.id, GRADE_REMEDIAL_P2, e.target.value)} className="w-12 text-center border-amber-200 focus:ring-amber-500 rounded py-1"/></td>
                                                <td className="p-1 text-center"><input type="number" value={extra ?? ''} onChange={(e) => handleGradeChange(student.id, GRADE_EXTRA, e.target.value)} disabled={!canTakeExtra} className={`w-12 text-center rounded py-1 ${!canTakeExtra ? 'opacity-30' : 'border-amber-400 focus:ring-amber-500'}`}/></td>
                                                <td className="p-1 text-center"><input type="number" value={special ?? ''} onChange={(e) => handleGradeChange(student.id, GRADE_SPECIAL, e.target.value)} disabled={!student.isRepeating} className={`w-12 text-center rounded py-1 ${!student.isRepeating ? 'opacity-30' : 'border-amber-500 focus:ring-amber-500'}`}/></td>
                                                <td className={`p-2 text-center font-bold bg-amber-100/50 ${getGradeColor(finalScore)}`}>{finalScore?.toFixed(1) || '-'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            ) : <div className="flex-1 flex items-center justify-center text-text-secondary"><p>Selecciona un grupo para calificar.</p></div>}
            
            {group && (
                <>
                    <Modal isOpen={isEvalModalOpen} onClose={() => setEvalModalOpen(false)} title={editingEvaluation ? 'Editar Evaluación' : 'Nueva Evaluación'}><EvaluationForm evaluation={editingEvaluation} group={group} onSave={(ev) => { dispatch({ type: 'SAVE_EVALUATION', payload: { groupId: group.id, evaluation: ev } }); setEvalModalOpen(false); }} onCancel={() => setEvalModalOpen(false)} /></Modal>
                    <Modal isOpen={isGroupConfigOpen} onClose={() => setGroupConfigOpen(false)} title="Configuración del Grupo" size="xl"><GroupForm group={group} existingGroups={groups} onSave={(ug) => { dispatch({ type: 'SAVE_GROUP', payload: ug }); setGroupConfigOpen(false); }} onCancel={() => setGroupConfigOpen(false)} onImportCriteria={() => {}} /></Modal>
                    <GradeImageModal isOpen={isImageModalOpen} onClose={() => setImageModalOpen(false)} group={group} evaluations={groupEvaluations} grades={groupGrades} attendance={attendance[group.id] || {}} settings={settings}/>
                    
                    <ConfirmationModal
                        isOpen={!!confirmDeleteEval}
                        onClose={() => setConfirmDeleteEval(null)}
                        onConfirm={deleteEvaluationAction}
                        title="Eliminar Evaluación"
                        variant="danger"
                        confirmText="Eliminar"
                    >
                        ¿Seguro que deseas eliminar la evaluación <strong>"{confirmDeleteEval?.name}"</strong>?
                        <p className="mt-2 text-xs opacity-70 text-red-500">Esta acción no se puede deshacer y borrará todas las calificaciones asignadas a ella.</p>
                    </ConfirmationModal>
                </>
            )}
        </div>
    );
};

export default GradesView;