import React, { useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import { Evaluation, Group } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import ConfirmationModal from './common/ConfirmationModal';
import { GroupForm } from './GroupManagement';
import { calculatePartialAverage, getGradeColor, calculateFinalGradeWithRecovery, calculateAttendancePercentage } from '../services/gradeCalculation';
import GradeImageModal from './GradeImageModal';
import CopyEvaluationsModal from './CopyEvaluationsModal';
import { motion, AnimatePresence } from 'framer-motion';

const GRADE_REMEDIAL_P1 = 'GRADE_REMEDIAL_P1';
const GRADE_REMEDIAL_P2 = 'GRADE_REMEDIAL_P2';
const GRADE_EXTRA = 'GRADE_EXTRA';
const GRADE_SPECIAL = 'GRADE_SPECIAL';

interface Coords { r: number; c: string; } // c es evaluationId

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
    
    const hasBaseTeams = useMemo(() => group.students.some(s => s.team), [group]);
    const hasCoyoteTeams = useMemo(() => group.students.some(s => s.teamCoyote), [group]);
    
    const initialTeamType = evaluation?.teamType || (hasCoyoteTeams && !hasBaseTeams ? 'coyote' : 'base');
    const [teamType, setTeamType] = useState<'base' | 'coyote'>(initialTeamType);
    
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
        onSave({ 
            id: evaluation?.id || uuidv4(), 
            name, 
            maxScore, 
            partial, 
            typeId, 
            isTeamBased, 
            teamType: isTeamBased ? teamType : undefined 
        });
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
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="isTeamBased" checked={isTeamBased} onChange={e => setIsTeamBased(e.target.checked)} className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"/>
                        <label htmlFor="isTeamBased" className="text-sm font-bold text-indigo-700 dark:text-indigo-400 cursor-pointer">
                            ¿Evaluación por EQUIPOS?
                        </label>
                    </div>
                    
                    {isTeamBased && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="block text-[10px] font-black uppercase text-indigo-600 mb-2">Usar integrantes de:</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setTeamType('base')}
                                    className={`flex items-center justify-center gap-2 p-2 rounded-lg border-2 text-xs font-bold transition-all ${teamType === 'base' ? 'bg-white border-indigo-600 text-indigo-700 shadow-sm' : 'bg-transparent border-transparent text-slate-400 opacity-60'}`}
                                >
                                    <Icon name="users" className="w-4 h-4"/> Equipos Base {!hasBaseTeams && '(Vacío)'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setTeamType('coyote')}
                                    className={`flex items-center justify-center gap-2 p-2 rounded-lg border-2 text-xs font-bold transition-all ${teamType === 'coyote' ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' : 'bg-transparent border-transparent text-slate-400 opacity-60'}`}
                                >
                                    <Icon name="dog" className="w-4 h-4"/> Equipos Coyote {!hasCoyoteTeams && '(Vacío)'}
                                </button>
                            </div>
                        </div>
                    )}
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
    const [isCopyModalOpen, setCopyModalOpen] = useState(false);
    const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | undefined>(undefined);
    const [viewMode, setViewMode] = useState<'ordinary' | 'recovery'>('ordinary');
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmDeleteEval, setConfirmDeleteEval] = useState<Evaluation | null>(null);
    const [displayTeamType, setDisplayTeamType] = useState<'base' | 'coyote'>('base');

    // ESTADOS PARA SELECCIÓN TIPO EXCEL
    const [selection, setSelection] = useState<{ start: Coords | null, end: Coords | null, isDragging: boolean }>({
        start: null, end: null, isDragging: false
    });
    const [bulkGradeValue, setBulkGradeValue] = useState('');
    const [floatingPos, setFloatingPos] = useState({ x: 0, y: 0 });

    const setSelectedGroupId = useCallback((id: string | null) => {
        dispatch({ type: 'SET_SELECTED_GROUP', payload: id });
    }, [dispatch]);

    const group = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
    
    const groupEvaluations = useMemo(() => (evaluations[selectedGroupId || ''] || []), [evaluations, selectedGroupId]);
    const groupGrades = useMemo(() => grades[selectedGroupId || ''] || {}, [grades, selectedGroupId]);
    
    const p1Evaluations = useMemo(() => groupEvaluations.filter(e => e.partial === 1), [groupEvaluations]);
    const p2Evaluations = useMemo(() => groupEvaluations.filter(e => e.partial === 2), [groupEvaluations]);
    
    const allColumnIds = useMemo(() => {
        if (viewMode === 'recovery') return [GRADE_REMEDIAL_P1, GRADE_REMEDIAL_P2, GRADE_EXTRA, GRADE_SPECIAL];
        return [...p1Evaluations.map(e => e.id), ...p2Evaluations.map(e => e.id)];
    }, [viewMode, p1Evaluations, p2Evaluations]);

    const p1AttendanceType = useMemo(() => group?.evaluationTypes.partial1.find(t => t.isAttendance), [group]);
    const p2AttendanceType = useMemo(() => group?.evaluationTypes.partial2.find(t => t.isAttendance), [group]);

    useEffect(() => { if (!selectedGroupId && groups.length > 0) setSelectedGroupId(groups[0].id); }, [groups, selectedGroupId, setSelectedGroupId]);
    
    const filteredStudents = useMemo(() => {
        if (!group) return [];
        const term = searchTerm.toLowerCase();
        return group.students.filter(s => 
            s.name.toLowerCase().includes(term) || 
            (s.matricula && s.matricula.toLowerCase().includes(term)) ||
            (s.nickname && s.nickname.toLowerCase().includes(term))
        );
    }, [group, searchTerm]);

    const studentsForRecovery = useMemo(() => {
        return filteredStudents.filter(student => {
            const att = attendance[group!.id]?.[student.id] || {};
            const globalAtt = calculateAttendancePercentage(group!, 'global', settings, att);
            const p1Avg = calculatePartialAverage(group!, 1, groupEvaluations, groupGrades[student.id] || {}, settings, att);
            const p2Avg = calculatePartialAverage(group!, 2, groupEvaluations, groupGrades[student.id] || {}, settings, att);
            const r1 = groupGrades[student.id]?.[GRADE_REMEDIAL_P1] ?? null, r2 = groupGrades[student.id]?.[GRADE_REMEDIAL_P2] ?? null;
            const extra = groupGrades[student.id]?.[GRADE_EXTRA] ?? null, special = groupGrades[student.id]?.[GRADE_SPECIAL] ?? null;
            const { isFailing, attendanceStatus } = calculateFinalGradeWithRecovery(p1Avg, p2Avg, r1, r2, extra, special, globalAtt, settings.lowAttendanceThreshold, settings.failByAttendance);
            return isFailing || attendanceStatus !== 'ok' || (p1Avg !== null && p1Avg < 7) || (p2Avg !== null && p2Avg < 7);
        });
    }, [group, filteredStudents, groupEvaluations, groupGrades, settings, attendance]);

    const hasBothTeamTypes = useMemo(() => {
        if (!group) return false;
        return group.students.some(s => s.team) && group.students.some(s => s.teamCoyote);
    }, [group]);

    const handleGradeChange = (studentId: string, evaluationId: string, score: string) => {
        if (selectedGroupId) {
            const val = parseFloat(score);
            const scoreValue = score === '' ? null : Math.max(0, isNaN(val) ? 0 : val);
            dispatch({ type: 'UPDATE_GRADE', payload: { groupId: selectedGroupId, studentId, evaluationId, score: scoreValue } });
        }
    };

    const handleReorder = (evaluationId: string, direction: 'left' | 'right') => {
        if (selectedGroupId) {
            dispatch({ type: 'REORDER_EVALUATION', payload: { groupId: selectedGroupId, evaluationId, direction } });
        }
    };

    // LÓGICA DE SELECCIÓN POR ARRASTRE
    const onMouseDown = (r: number, c: string, e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setSelection({ start: { r, c }, end: { r, c }, isDragging: true });
    };

    const onMouseEnter = (r: number, c: string) => {
        if (selection.isDragging) {
            setSelection(prev => ({ ...prev, end: { r, c } }));
        }
    };

    const onMouseUp = (e: React.MouseEvent) => {
        if (selection.isDragging) {
            setSelection(prev => ({ ...prev, isDragging: false }));
            setFloatingPos({ x: e.clientX, y: e.clientY });
        }
    };

    const isSelected = (r: number, cId: string) => {
        if (!selection.start || !selection.end) return false;
        const minR = Math.min(selection.start.r, selection.end.r);
        const maxR = Math.max(selection.start.r, selection.end.r);
        const startCIdx = allColumnIds.indexOf(selection.start.c);
        const endCIdx = allColumnIds.indexOf(selection.end.c);
        const minC = Math.min(startCIdx, endCIdx);
        const maxC = Math.max(startCIdx, endCIdx);
        const currentCIdx = allColumnIds.indexOf(cId);
        return r >= minR && r <= maxR && currentCIdx >= minC && currentCIdx <= maxC;
    };

    const handleBulkFill = () => {
        if (!selection.start || !selection.end || !selectedGroupId) return;
        const minR = Math.min(selection.start.r, selection.end.r), maxR = Math.max(selection.start.r, selection.end.r);
        const startCIdx = allColumnIds.indexOf(selection.start.c), endCIdx = allColumnIds.indexOf(selection.end.c);
        const minC = Math.min(startCIdx, endCIdx), maxC = Math.max(startCIdx, endCIdx);
        const targetList = viewMode === 'recovery' ? studentsForRecovery : filteredStudents;
        const val = parseFloat(bulkGradeValue);
        const numericValue = bulkGradeValue === '' ? null : Math.max(0, isNaN(val) ? 0 : val);
        let count = 0;
        for (let r = minR; r <= maxR; r++) {
            const student = targetList[r]; if (!student) continue;
            for (let cIdx = minC; cIdx <= maxC; cIdx++) {
                const evalId = allColumnIds[cIdx];
                dispatch({ type: 'UPDATE_GRADE', payload: { groupId: selectedGroupId, studentId: student.id, evaluationId: evalId, score: numericValue } });
                count++;
            }
        }
        dispatch({ type: 'ADD_TOAST', payload: { message: `Se actualizaron ${count} celdas.`, type: 'success' } });
        setSelection({ start: null, end: null, isDragging: false }); setBulkGradeValue('');
    };

    const handlePaste = (e: React.ClipboardEvent, studentIndex: number, evaluationId: string) => {
        const pasteData = e.clipboardData.getData('text');
        const rows = pasteData.split(/\r?\n/).filter(line => line.trim() !== "");
        if (rows.length > 1 && selectedGroupId) {
            e.preventDefault(); let count = 0;
            rows.forEach((rowValue, offset) => {
                const targetStudent = filteredStudents[studentIndex + offset];
                if (targetStudent) {
                    const cleanValue = rowValue.trim().replace(',', '.');
                    const numericValue = parseFloat(cleanValue);
                    if (!isNaN(numericValue)) {
                        handleGradeChange(targetStudent.id, evaluationId, Math.max(0, numericValue).toString());
                        count++;
                    }
                }
            });
            dispatch({ type: 'ADD_TOAST', payload: { message: `Se pegaron ${count} calificaciones correctamente.`, type: 'success' } });
        }
    };

    const deleteEvaluationAction = () => {
        if (confirmDeleteEval && selectedGroupId) {
            dispatch({ type: 'DELETE_EVALUATION', payload: { groupId: selectedGroupId, evaluationId: confirmDeleteEval.id } });
            setConfirmDeleteEval(null);
        }
    };

    const renderHeaderButtons = (ev: Evaluation) => {
        const samePartialEvals = ev.partial === 1 ? p1Evaluations : p2Evaluations;
        const isFirst = samePartialEvals[0]?.id === ev.id;
        const isLast = samePartialEvals[samePartialEvals.length - 1]?.id === ev.id;

        return (
            <div className="flex flex-col items-center justify-center p-2 relative group w-full min-w-[80px]">
                <div className="absolute top-0 right-0 flex sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/90 rounded-md shadow-md z-10 p-0.5 border border-slate-200">
                    {!isFirst && (
                        <button onClick={() => handleReorder(ev.id, 'left')} className="p-1 text-slate-600 hover:bg-slate-100 rounded" title="Mover Izquierda"><Icon name="chevron-left" className="w-3.5 h-3.5"/></button>
                    )}
                    <button onClick={() => {setEditingEvaluation(ev); setEvalModalOpen(true);}} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><Icon name="edit-3" className="w-3.5 h-3.5"/></button>
                    <button onClick={() => setConfirmDeleteEval(ev)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Borrar"><Icon name="trash-2" className="w-3.5 h-3.5"/></button>
                    {!isLast && (
                        <button onClick={() => handleReorder(ev.id, 'right')} className="p-1 text-slate-600 hover:bg-slate-100 rounded" title="Mover Derecha"><Icon name="chevron-right" className="w-3.5 h-3.5"/></button>
                    )}
                </div>
                {ev.isTeamBased && <div className="flex items-center gap-1 mb-0.5"><Icon name={ev.teamType === 'coyote' ? "dog" : "users"} className={`w-3 h-3 ${ev.teamType === 'coyote' ? 'text-orange-500' : 'text-indigo-500'}`} /></div>}
                <span className={`text-[10px] font-bold leading-tight line-clamp-2 px-1 text-center ${ev.isTeamBased ? (ev.teamType === 'coyote' ? 'text-orange-800' : 'text-indigo-800') : ''}`}>{ev.name}</span>
                <span className="text-[9px] opacity-60 font-normal">({ev.maxScore} pts)</span>
            </div>
        );
    };

    const attThresholdNote = useMemo(() => (settings.lowAttendanceThreshold || 80) / 10, [settings.lowAttendanceThreshold]);

    return (
        <div className="flex flex-col h-full overflow-hidden" onMouseUp={onMouseUp}>
            <div className="bg-surface p-3 mb-4 rounded-xl border border-border-color shadow-sm flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <select value={selectedGroupId || ''} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-full sm:w-56 p-2 border border-border-color rounded-md bg-white text-sm focus:ring-2 focus:ring-primary">
                        <option value="" disabled>Selecciona un grupo</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Icon name="search" className="h-4 w-4" /></div>
                        <input type="text" className="block w-full pl-9 pr-3 py-2 border border-border-color rounded-md bg-white text-sm focus:ring-1 focus:ring-primary" placeholder="Buscar alumno..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="bg-surface-secondary p-1 rounded-lg flex border border-border-color">
                        <button onClick={() => setViewMode('ordinary')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${viewMode === 'ordinary' ? 'bg-white shadow text-primary' : 'text-text-secondary'}`}>Ordinario</button>
                        <button onClick={() => setViewMode('recovery')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${viewMode === 'recovery' ? 'bg-amber-100 shadow text-amber-800' : 'text-text-secondary'}`}>Recuperación</button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-color pt-3">
                    <div className="flex items-center gap-4">
                        <button onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { showTeamsInGrades: !settings.showTeamsInGrades } })} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${settings.showTeamsInGrades ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-surface border-border-color text-text-secondary'}`}><Icon name="users" className="w-4 h-4"/> Equipos: {settings.showTeamsInGrades ? 'ON' : 'OFF'}</button>
                    </div>
                    {viewMode === 'ordinary' && (
                        <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setCopyModalOpen(true)}><Icon name="copy" className="w-4 h-4"/><span className="hidden lg:inline ml-1">Copiar Tareas</span></Button>
                            <Button variant="secondary" size="sm" onClick={() => setImageModalOpen(true)}><Icon name="camera" className="w-4 h-4"/></Button>
                            <Button variant="secondary" size="sm" onClick={() => setGroupConfigOpen(true)}><Icon name="settings" className="w-4 h-4"/></Button>
                            <Button size="sm" onClick={() => { setEditingEvaluation(undefined); setEvalModalOpen(true); }}><Icon name="plus" className="w-4 h-4"/> <span className="hidden sm:inline ml-1">Nueva Evaluación</span></Button>
                        </div>
                    )}
                </div>
            </div>

            {group ? (
                <div className="flex-1 bg-surface rounded-xl border border-border-color shadow-sm overflow-hidden flex flex-col relative">
                    <AnimatePresence>
                        {selection.start && selection.end && !selection.isDragging && (Math.abs(selection.start.r - selection.end.r) > 0 || selection.start.c !== selection.end.c) && (
                            <motion.div initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} className="fixed z-[100] bg-white border border-indigo-200 shadow-2xl p-1.5 rounded-xl flex items-center gap-2" style={{ left: Math.min(window.innerWidth - 250, floatingPos.x), top: Math.min(window.innerHeight - 80, floatingPos.y + 15) }}>
                                <div className="bg-indigo-600 p-2 rounded-lg text-white"><Icon name="edit-3" className="w-4 h-4" /></div>
                                <input id="bulk-fill-input" type="number" step="0.1" min="0" placeholder="Nota..." className="w-20 p-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary font-bold" value={bulkGradeValue} onChange={e => setBulkGradeValue(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleBulkFill()} />
                                <Button id="bulk-fill-btn" size="sm" onClick={handleBulkFill} className="!py-1.5 !px-3 shadow-sm">Llenar</Button>
                                <button onClick={() => setSelection({ start: null, end: null, isDragging: false })} className="p-1.5 hover:bg-slate-100 rounded text-slate-400"><Icon name="x" className="w-4 h-4" /></button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="overflow-auto flex-1 custom-scrollbar select-none">
                        {viewMode === 'ordinary' ? (
                            <table className="w-full border-collapse text-xs">
                                <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                                    <tr>
                                        <th rowSpan={2} className="sticky left-0 bg-slate-50 p-3 text-left font-bold border-b border-r border-slate-200 z-30 min-w-max">Alumno</th>
                                        {settings.showTeamsInGrades && (
                                            <th rowSpan={2} className="p-0 font-bold text-center border-b border-r border-slate-200 bg-slate-100 text-[10px] w-20">
                                                <div className="flex flex-col h-full items-center justify-center gap-1">
                                                    <span className="uppercase tracking-tighter opacity-60">Eq.</span>
                                                    {hasBothTeamTypes ? (
                                                        <button onClick={(e) => { e.stopPropagation(); setDisplayTeamType(prev => prev === 'base' ? 'coyote' : 'base'); }} className={`p-1 rounded-md transition-all flex items-center gap-1.5 ${displayTeamType === 'coyote' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}><Icon name={displayTeamType === 'coyote' ? "dog" : "users"} className="w-3 h-3"/></button>
                                                    ) : <Icon name={displayTeamType === 'coyote' ? "dog" : "users"} className="w-3.5 h-3.5 text-slate-400"/>}
                                                </div>
                                            </th>
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
                                        const att = attendance[group.id]?.[student.id] || {};
                                        const p1Avg = calculatePartialAverage(group, 1, groupEvaluations, groupGrades[student.id] || {}, settings, att);
                                        const p2Avg = calculatePartialAverage(group, 2, groupEvaluations, groupGrades[student.id] || {}, settings, att);
                                        const p1AttNote = calculateAttendancePercentage(group, 1, settings, att) / 10;
                                        const p2AttNote = calculateAttendancePercentage(group, 2, settings, att) / 10;
                                        const globalAtt = calculateAttendancePercentage(group, 'global', settings, att);
                                        const tolerance = 5;
                                        const isCriticalFail = globalAtt < (settings.lowAttendanceThreshold - tolerance);
                                        const isRisk = globalAtt < settings.lowAttendanceThreshold && !isCriticalFail;
                                        const teamValue = displayTeamType === 'coyote' ? student.teamCoyote : student.team;

                                        return (
                                            <tr key={student.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} border-b border-slate-100 hover:bg-indigo-50/20 ${(isCriticalFail && settings.failByAttendance) ? '!bg-rose-50/30' : (isRisk || isCriticalFail) ? '!bg-indigo-50/20' : ''}`}>
                                                <td className="sticky left-0 bg-inherit p-2.5 font-medium border-r border-slate-100 z-10 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] text-slate-400 w-4 inline-block text-right">{idx + 1}.</span>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`font-bold ${(isCriticalFail && settings.failByAttendance) ? 'text-rose-600' : (isRisk || isCriticalFail) ? 'text-indigo-600' : ''}`}>{student.name}</span>
                                                                {isCriticalFail && settings.failByAttendance && <span className="text-[7px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shadow-sm border border-rose-700">Reprobado por Faltas</span>}
                                                                {isCriticalFail && !settings.failByAttendance && <span className="text-[7px] font-black bg-indigo-500 text-white px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shadow-sm border border-indigo-600">Baja Asistencia</span>}
                                                                {isRisk && <span className="text-[7px] font-black bg-indigo-400 text-white px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shadow-sm border border-indigo-500">Riesgo Asist.</span>}
                                                            </div>
                                                            {student.nickname && <span className="text-[10px] text-text-secondary italic leading-none mt-0.5">({student.nickname})</span>}
                                                        </div>
                                                        {student.isRepeating && <span className="bg-rose-600 text-white text-[8px] font-bold px-1 rounded-full shrink-0 ml-auto">R</span>}
                                                    </div>
                                                </td>
                                                {settings.showTeamsInGrades && <td className="p-1 text-center font-bold border-r border-slate-100 text-[10px] truncate max-w-[80px]">{teamValue || '-'}</td>}
                                                {p1Evaluations.map(ev => (
                                                    <td key={ev.id} className={`p-1 border-r border-slate-100 transition-colors ${isSelected(idx, ev.id) ? 'bg-indigo-100/80 ring-2 ring-indigo-500 ring-inset z-10' : ''}`} onMouseDown={(e) => onMouseDown(idx, ev.id, e)} onMouseEnter={() => onMouseEnter(idx, ev.id)}>
                                                        <input type="number" step="0.1" min="0" value={groupGrades[student.id]?.[ev.id] ?? ''} onChange={(e) => handleGradeChange(student.id, ev.id, e.target.value)} onPaste={(e) => handlePaste(e, idx, ev.id)} className={`w-full max-w-[50px] mx-auto block bg-transparent text-center focus:ring-1 focus:ring-primary rounded py-1 ${isSelected(idx, ev.id) ? 'font-black text-indigo-900' : ''}`} placeholder="-"/>
                                                    </td>
                                                ))}
                                                {p1AttendanceType && <td className={`p-1 text-center font-black border-r border-slate-100 ${p1AttNote < attThresholdNote ? 'text-rose-600' : 'text-emerald-600'}`}>{p1AttNote.toFixed(1)}</td>}
                                                <td className={`p-2 text-center font-bold border-r border-slate-100 bg-slate-50/50 ${getGradeColor(p1Avg)}`}>{p1Avg?.toFixed(1) || '-'}</td>
                                                {p2Evaluations.map(ev => (
                                                    <td key={ev.id} className={`p-1 border-r border-slate-100 transition-colors ${isSelected(idx, ev.id) ? 'bg-indigo-100/80 ring-2 ring-indigo-500 ring-inset z-10' : ''}`} onMouseDown={(e) => onMouseDown(idx, ev.id, e)} onMouseEnter={() => onMouseEnter(idx, ev.id)}>
                                                        <input type="number" step="0.1" min="0" value={groupGrades[student.id]?.[ev.id] ?? ''} onChange={(e) => handleGradeChange(student.id, ev.id, e.target.value)} onPaste={(e) => handlePaste(e, idx, ev.id)} className={`w-full max-w-[50px] mx-auto block bg-transparent text-center focus:ring-1 focus:ring-primary rounded py-1 ${isSelected(idx, ev.id) ? 'font-black text-indigo-900' : ''}`} placeholder="-"/>
                                                    </td>
                                                ))}
                                                {p2AttendanceType && <td className={`p-1 text-center font-black border-r border-slate-100 ${p2AttNote < attThresholdNote ? 'text-rose-600' : 'text-emerald-600'}`}>{p2AttNote.toFixed(1)}</td>}
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
                                        <th className="p-2 text-center">Asist %</th>
                                        <th className="p-2 text-center">Rem P1</th>
                                        <th className="p-2 text-center">Rem P2</th>
                                        <th className="p-2 text-center">Extra</th>
                                        <th className="p-2 text-center">Especial</th>
                                        <th className="p-2 text-center bg-amber-100/50">FINAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentsForRecovery.map((student, idx) => {
                                        const att = attendance[group.id]?.[student.id] || {};
                                        const globalAtt = calculateAttendancePercentage(group, 'global', settings, att);
                                        const p1Avg = calculatePartialAverage(group, 1, groupEvaluations, groupGrades[student.id] || {}, settings, att);
                                        const p2Avg = calculatePartialAverage(group, 2, groupEvaluations, groupGrades[student.id] || {}, settings, att);
                                        const r1 = groupGrades[student.id]?.[GRADE_REMEDIAL_P1] ?? null, r2 = groupGrades[student.id]?.[GRADE_REMEDIAL_P2] ?? null;
                                        const extra = groupGrades[student.id]?.[GRADE_EXTRA] ?? null, special = groupGrades[student.id]?.[GRADE_SPECIAL] ?? null;
                                        const { score: finalScore, attendanceStatus } = calculateFinalGradeWithRecovery(p1Avg, p2Avg, r1, r2, extra, special, globalAtt, settings.lowAttendanceThreshold, settings.failByAttendance);
                                        
                                        // LÓGICA DE HABILITACIÓN ("Waterflow Logic")
                                        const canRemP1 = p1Avg !== null && p1Avg < 7;
                                        const canRemP2 = p2Avg !== null && p2Avg < 7;
                                        const effectiveP1 = r1 !== null ? r1 : (p1Avg ?? 0);
                                        const effectiveP2 = r2 !== null ? r2 : (p2Avg ?? 0);
                                        const canExtra = (effectiveP1 < 7 || effectiveP2 < 7);
                                        const canSpecial = student.isRepeating && ( (r1 !== null && r1 < 7) || (r2 !== null && r2 < 7) || (extra !== null && extra < 7) );

                                        return (
                                            <tr key={student.id} className={`border-b border-amber-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'} ${attendanceStatus === 'fail' && settings.failByAttendance ? 'bg-rose-50' : (attendanceStatus === 'fail' || attendanceStatus === 'risk') ? 'bg-indigo-50/30' : ''}`}>
                                                <td className="p-2.5 font-bold whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={(attendanceStatus === 'fail' && settings.failByAttendance) ? 'text-rose-700' : (attendanceStatus === 'fail' || attendanceStatus === 'risk') ? 'text-indigo-800' : ''}>{student.name}</span>
                                                            {attendanceStatus === 'fail' && settings.failByAttendance && <span className="text-[7px] font-black bg-rose-700 text-white px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shadow-sm">Reprobado por Faltas</span>}
                                                            {attendanceStatus === 'fail' && !settings.failByAttendance && <span className="text-[7px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shadow-sm">Baja Asistencia</span>}
                                                            {attendanceStatus === 'risk' && <span className="text-[7px] font-black bg-indigo-500 text-white px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shadow-sm">Riesgo por Asistencia</span>}
                                                        </div>
                                                        <span className="text-[9px] font-normal text-slate-400">Mat: {student.matricula} {student.isRepeating && <span className="font-black text-rose-600 ml-1">(RECURSAMIENTO)</span>}</span>
                                                    </div>
                                                </td>
                                                <td className={`p-1 text-center font-black ${attendanceStatus === 'fail' && settings.failByAttendance ? 'text-rose-600' : (attendanceStatus === 'fail' || attendanceStatus === 'risk') ? 'text-indigo-600' : 'text-slate-500'}`}>{globalAtt.toFixed(0)}%</td>
                                                <td className={`p-1 text-center transition-colors ${isSelected(idx, GRADE_REMEDIAL_P1) ? 'bg-amber-200' : ''}`} onMouseDown={(e) => canRemP1 && onMouseDown(idx, GRADE_REMEDIAL_P1, e)} onMouseEnter={() => canRemP1 && onMouseEnter(idx, GRADE_REMEDIAL_P1)}>
                                                    <input type="number" min="0" value={r1 ?? ''} onChange={(e) => handleGradeChange(student.id, GRADE_REMEDIAL_P1, e.target.value)} onPaste={(e) => handlePaste(e, idx, GRADE_REMEDIAL_P1)} disabled={!canRemP1} className={`w-12 text-center rounded py-1 bg-transparent ${!canRemP1 ? 'opacity-10 cursor-not-allowed' : 'border-amber-200 focus:ring-amber-500'}`}/>
                                                </td>
                                                <td className={`p-1 text-center transition-colors ${isSelected(idx, GRADE_REMEDIAL_P2) ? 'bg-amber-200' : ''}`} onMouseDown={(e) => canRemP2 && onMouseDown(idx, GRADE_REMEDIAL_P2, e)} onMouseEnter={() => canRemP2 && onMouseEnter(idx, GRADE_REMEDIAL_P2)}>
                                                    <input type="number" min="0" value={r2 ?? ''} onChange={(e) => handleGradeChange(student.id, GRADE_REMEDIAL_P2, e.target.value)} onPaste={(e) => handlePaste(e, idx, GRADE_REMEDIAL_P2)} disabled={!canRemP2} className={`w-12 text-center rounded py-1 bg-transparent ${!canRemP2 ? 'opacity-10 cursor-not-allowed' : 'border-amber-200 focus:ring-amber-500'}`}/>
                                                </td>
                                                <td className={`p-1 text-center transition-colors ${isSelected(idx, GRADE_EXTRA) ? 'bg-amber-200' : ''}`} onMouseDown={(e) => canExtra && onMouseDown(idx, GRADE_EXTRA, e)} onMouseEnter={() => canExtra && onMouseEnter(idx, GRADE_EXTRA)}>
                                                    <input type="number" min="0" value={extra ?? ''} onChange={(e) => handleGradeChange(student.id, GRADE_EXTRA, e.target.value)} onPaste={(e) => handlePaste(e, idx, GRADE_EXTRA)} disabled={!canExtra} className={`w-12 text-center rounded py-1 bg-transparent ${!canExtra ? 'opacity-10 cursor-not-allowed' : 'border-amber-400 focus:ring-amber-500'}`}/>
                                                </td>
                                                <td className={`p-1 text-center transition-colors ${isSelected(idx, GRADE_SPECIAL) ? 'bg-amber-200' : ''}`} onMouseDown={(e) => canSpecial && onMouseDown(idx, GRADE_SPECIAL, e)} onMouseEnter={() => canSpecial && onMouseEnter(idx, GRADE_SPECIAL)}>
                                                    <input type="number" min="0" value={special ?? ''} onChange={(e) => handleGradeChange(student.id, GRADE_SPECIAL, e.target.value)} onPaste={(e) => handlePaste(e, idx, GRADE_SPECIAL)} disabled={!canSpecial} className={`w-12 text-center rounded py-1 bg-transparent ${!canSpecial ? 'opacity-10 cursor-not-allowed' : 'border-amber-500 focus:ring-amber-500'}`}/>
                                                </td>
                                                <td className={`p-2 text-center font-black bg-amber-100/50 ${getGradeColor(finalScore)} ${attendanceStatus === 'fail' && settings.failByAttendance ? 'ring-2 ring-rose-500 ring-inset' : (attendanceStatus === 'fail' || attendanceStatus === 'risk') ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}>
                                                    {finalScore?.toFixed(1) || '-'}
                                                </td>
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
                    <Modal isOpen={isGroupConfigOpen} onClose={() => setGroupConfigOpen(false)} title="Configuración del Grupo" size="xl"><GroupForm group={group} onSave={(ug) => { dispatch({ type: 'SAVE_GROUP', payload: ug }); setGroupConfigOpen(false); }} onCancel={() => setGroupConfigOpen(false)} /></Modal>
                    <GradeImageModal isOpen={isImageModalOpen} onClose={() => setImageModalOpen(false)} group={group} evaluations={groupEvaluations} grades={groupGrades} attendance={attendance[group.id] || {}} settings={settings}/>
                    <CopyEvaluationsModal isOpen={isCopyModalOpen} onClose={() => setCopyModalOpen(false)} targetGroup={group} />
                    <ConfirmationModal isOpen={!!confirmDeleteEval} onClose={() => setConfirmDeleteEval(null)} onConfirm={deleteEvaluationAction} title="Eliminar Evaluación" variant="danger" confirmText="Eliminar">¿Seguro que deseas eliminar la evaluación <strong>"{confirmDeleteEval?.name}"</strong>?</ConfirmationModal>
                </>
            )}
        </div>
    );
};

export default GradesView;