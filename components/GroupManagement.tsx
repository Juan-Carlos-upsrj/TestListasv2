
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Group, Student, DayOfWeek, EvaluationType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import ConfirmationModal from './common/ConfirmationModal';
import { DAYS_OF_WEEK, GROUP_COLORS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

export const EvaluationTypesEditor: React.FC<{
    types: EvaluationType[];
    onTypesChange: (types: EvaluationType[]) => void;
    partialName: string;
}> = ({ types, onTypesChange, partialName }) => {
    const totalWeight = useMemo(() => types.reduce((sum, type) => sum + (Number(type.weight) || 0), 0), [types]);
    const handleTypeChange = (id: string, field: 'name' | 'weight', value: string) => {
        onTypesChange(types.map(type => type.id === id ? { ...type, [field]: field === 'weight' ? Number(value) : value } : type));
    };
    const addType = () => onTypesChange([...types, { id: uuidv4(), name: '', weight: 0 }]);
    const addAttendanceType = () => {
        if (types.some(t => t.isAttendance)) { alert('Ya existe un criterio de asistencia.'); return; }
        onTypesChange([...types, { id: uuidv4(), name: 'Asistencia', weight: 0, isAttendance: true }]);
    };
    const removeType = (id: string) => onTypesChange(types.filter(type => type.id !== id));

    return (
        <fieldset className="border p-3 rounded-md border-border-color">
            <legend className="px-1 text-sm font-semibold">{partialName}</legend>
            <div className="space-y-2">
                {types.map(type => (
                    <div key={type.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-7 relative">
                             <input type="text" placeholder="Nombre" value={type.name} onChange={e => handleTypeChange(type.id, 'name', e.target.value)} disabled={type.isAttendance} className={`w-full p-1.5 border border-border-color rounded-md bg-surface text-sm focus:ring-1 focus:ring-primary ${type.isAttendance ? 'pl-8 opacity-80' : ''}`}/>
                            {type.isAttendance && <div className="absolute left-2 top-1/2 -translate-y-1/2 text-primary" title="Automático"><Icon name="users" className="w-4 h-4"/></div>}
                        </div>
                        <div className="col-span-4 relative">
                            <input type="number" value={type.weight} onChange={e => handleTypeChange(type.id, 'weight', e.target.value)} className="w-full p-1.5 border border-border-color rounded-md bg-surface text-sm focus:ring-1 focus:ring-primary" min="0" max="100"/>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs">%</span>
                        </div>
                        <button type="button" onClick={() => removeType(type.id)} className="col-span-1 text-accent-red hover:bg-accent-red-light rounded-full p-1"><Icon name="trash-2" className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>
            <div className="flex justify-between items-center mt-3">
                 <div className="flex gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={addType} className="!p-1.5"><Icon name="plus" className="w-3 h-3"/></Button>
                    <Button type="button" size="sm" variant="secondary" onClick={addAttendanceType} disabled={types.some(t => t.isAttendance)} className="!p-1.5"><Icon name="users" className="w-3 h-3"/></Button>
                 </div>
                <div className={`text-xs font-bold ${totalWeight !== 100 ? 'text-accent-red' : 'text-accent-green-dark'}`}>Total: {totalWeight}%</div>
            </div>
        </fieldset>
    );
};

const BulkStudentForm: React.FC<{ onSave: (students: Student[]) => void; onCancel: () => void; }> = ({ onSave, onCancel }) => {
    const [studentData, setStudentData] = useState('');
    const handleImport = () => {
        const lines = studentData.split('\n').filter(line => line.trim() !== '');
        const newStudents: Student[] = lines.map(line => {
            const parts = line.split(/[,;\t]/).map(p => p.trim());
            return { id: uuidv4(), name: parts[0] || '', matricula: parts[1] || '', nickname: parts[2] || '' };
        }).filter(s => s.name);
        if (newStudents.length > 0) onSave(newStudents);
    };
    return (
        <div className="space-y-4">
            <textarea value={studentData} onChange={e => setStudentData(e.target.value)} rows={8} className="w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary" placeholder="Pega: Nombre, Matrícula, Apodo (uno por línea)"/>
            <div className="flex justify-end gap-3"><Button variant="secondary" onClick={onCancel}>Cancelar</Button><Button onClick={handleImport}>Importar</Button></div>
        </div>
    );
};

export const GroupForm: React.FC<{ group?: Group; existingGroups?: Group[]; onSave: (group: Group) => void; onCancel: () => void; onImportCriteria: (groupId: string) => void; }> = ({ group, existingGroups = [], onSave, onCancel, onImportCriteria }) => {
    const [name, setName] = useState(group?.name || ''), [subject, setSubject] = useState(group?.subject || ''), [subjectShortName, setSubjectShortName] = useState(group?.subjectShortName || ''), [quarter, setQuarter] = useState(group?.quarter || ''), [classDays, setClassDays] = useState<DayOfWeek[]>(group?.classDays || []), [color, setColor] = useState(group?.color || GROUP_COLORS[0].name);
    const [p1Types, setP1Types] = useState<EvaluationType[]>(group?.evaluationTypes?.partial1 || [{ id: uuidv4(), name: 'General', weight: 100 }]), [p2Types, setP2Types] = useState<EvaluationType[]>(group?.evaluationTypes?.partial2 || [{ id: uuidv4(), name: 'General', weight: 100 }]);
    
    const handleDayToggle = (day: DayOfWeek) => setClassDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    
    React.useEffect(() => {
        if (group && group.evaluationTypes) {
             setP1Types(group.evaluationTypes.partial1);
             setP2Types(group.evaluationTypes.partial2);
        }
    }, [group?.evaluationTypes]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault(); const p1w = p1Types.reduce((s, t) => s + Number(t.weight), 0), p2w = p2Types.reduce((s, t) => s + Number(t.weight), 0);
        if (!name || !subject) { alert('Nombre y materia requeridos.'); return; }
        if (p1w !== 100 || p2w !== 100) { alert('La suma debe ser 100%.'); return; }
        onSave({ id: group?.id || uuidv4(), name, subject, subjectShortName: subjectShortName.trim().toUpperCase() || undefined, quarter, classDays, students: group?.students || [], color, evaluationTypes: { partial1: p1Types, partial2: p2Types } });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Nombre</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Cuatrimestre</label><input type="text" placeholder="Ej. 5º" value={quarter} onChange={e => setQuarter(e.target.value)} className="w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Materia</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} required className="w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Abrev. Materia</label><input type="text" value={subjectShortName} onChange={e => setSubjectShortName(e.target.value)} maxLength={8} className="w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary font-bold"/></div>
            </div>
            <div><label className="block text-xs font-medium mb-2">Días</label><div className="flex flex-wrap gap-1.5">{DAYS_OF_WEEK.map(day => (<button type="button" key={day} onClick={() => handleDayToggle(day)} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${classDays.includes(day) ? 'bg-primary text-primary-text' : 'bg-surface-secondary hover:bg-border-color'}`}>{day}</button>))}</div></div>
            <div><label className="block text-xs font-medium mb-2">Color</label><div className="flex flex-wrap gap-2.5">{GROUP_COLORS.map(c => (<button type="button" key={c.name} onClick={() => setColor(c.name)} className={`w-7 h-7 rounded-full ${c.bg} transition-transform hover:scale-110 ${color === c.name ? 'ring-2 ring-offset-2 ring-primary ring-offset-surface' : ''}`}/>))}</div></div>
            <div className="space-y-3">
                <div className="flex justify-between items-center"><label className="text-sm font-bold">Ponderación</label>{existingGroups.length > 0 && <select className="text-[10px] p-1 border border-border-color rounded bg-surface focus:ring-1 focus:ring-primary" onChange={e => { if(e.target.value) { onImportCriteria(e.target.value); e.target.value = ""; } }} defaultValue=""><option value="" disabled>Copiar de...</option>{existingGroups.filter(g => g.id !== group?.id).map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}</select>}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><EvaluationTypesEditor types={p1Types} onTypesChange={setP1Types} partialName="Parcial 1" /><EvaluationTypesEditor types={p2Types} onTypesChange={setP2Types} partialName="Parcial 2" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="secondary" onClick={onCancel} size="sm">Cancelar</Button><Button type="submit" size="sm">{group ? 'Guardar' : 'Crear'}</Button></div>
        </form>
    );
};

const StudentForm: React.FC<{ student?: Student; currentGroup?: Group; allGroups?: Group[]; onSave: (student: Student) => void; onCancel: () => void; }> = ({ student, currentGroup, allGroups = [], onSave, onCancel }) => {
    const [name, setName] = useState(student?.name || ''), [matricula, setMatricula] = useState(student?.matricula || ''), [nickname, setNickname] = useState(student?.nickname || ''), [isRepeating, setIsRepeating] = useState(student?.isRepeating || false), [team, setTeam] = useState(student?.team || '');
    const suggestedTeams = useMemo(() => { if (!currentGroup || !currentGroup.quarter) return []; const teams = new Set<string>(); allGroups.forEach(g => { if (g.quarter === currentGroup.quarter) g.students.forEach(s => { if (s.team) teams.add(s.team); }); }); return Array.from(teams).sort(); }, [allGroups, currentGroup]);
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!name) return; onSave({ ...student, id: student?.id || uuidv4(), name, matricula, nickname, isRepeating, team: team.trim() || undefined }); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-xs font-medium">Nombre Completo</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium">Matrícula</label><input type="text" value={matricula} onChange={e => setMatricula(e.target.value)} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
                <div><label className="block text-xs font-medium text-primary">Equipo Base</label><input list="quarter-teams" value={team} onChange={e => setTeam(e.target.value)} placeholder="Ej. Equipo 1" className="mt-1 w-full p-2 border border-primary/30 rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/><datalist id="quarter-teams">{suggestedTeams.map(t => <option key={t} value={t}/>)}</datalist></div>
            </div>
            <div><label className="block text-xs font-medium">Apodo (Opcional)</label><input type="text" value={nickname} onChange={e => setNickname(e.target.value)} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
            <div className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-900/40"><input type="checkbox" id="isRepeating" checked={isRepeating} onChange={e => setIsRepeating(e.target.checked)} className="h-5 w-5 rounded text-rose-600 focus:ring-rose-500"/><label htmlFor="isRepeating" className="text-sm font-bold text-rose-700 dark:text-rose-400 cursor-pointer">¿Es de RECURSAMIENTO?</label></div>
            <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="secondary" onClick={onCancel} size="sm">Cancelar</Button><Button type="submit" size="sm">{student ? 'Guardar' : 'Agregar'}</Button></div>
        </form>
    );
};

// --- TEAM MANAGEMENT COMPONENTS ---

const TeamsManager: React.FC<{ group: Group }> = ({ group }) => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, teamNotes = {}, coyoteTeamNotes = {} } = state;
    
    const [isCoyoteMode, setCoyoteMode] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isTeamsModalOpen, setTeamsModalOpen] = useState(false);

    // Context-aware student list
    const studentsList = useMemo(() => {
        if (isCoyoteMode) {
            // Mode Coyote: Show ALL students in the same quarter across all groups
            const allQuarterStudents: {student: Student, gName: string}[] = [];
            groups.filter(g => g.quarter === group.quarter).forEach(g => {
                g.students.forEach(s => allQuarterStudents.push({student: s, gName: g.name}));
            });
            return allQuarterStudents;
        } else {
            // Mode Base: Just this group
            return group.students.map(s => ({student: s, gName: group.name}));
        }
    }, [groups, group, isCoyoteMode]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm.trim()) return studentsList;
        const s = searchTerm.toLowerCase();
        return studentsList.filter(item => 
            item.student.name.toLowerCase().includes(s) || 
            item.student.matricula.toLowerCase().includes(s) ||
            item.student.team?.toLowerCase().includes(s) ||
            item.student.teamCoyote?.toLowerCase().includes(s)
        );
    }, [studentsList, searchTerm]);

    // Context-aware team list
    const existingTeams = useMemo(() => {
        const teamsMap = new Map<string, number>();
        if (isCoyoteMode) {
            studentsList.forEach(item => {
                if (item.student.teamCoyote) {
                    teamsMap.set(item.student.teamCoyote, (teamsMap.get(item.student.teamCoyote) || 0) + 1);
                }
            });
        } else {
            group.students.forEach(s => {
                if (s.team) {
                    teamsMap.set(s.team, (teamsMap.get(s.team) || 0) + 1);
                }
            });
        }
        return Array.from(teamsMap.entries()).sort((a,b) => a[0].localeCompare(b[0]));
    }, [studentsList, group.students, isCoyoteMode]);

    const handleAssign = (studentId: string, assign: boolean) => {
        if (!selectedTeam) return;
        
        if (assign && isCoyoteMode) {
            const teamCount = existingTeams.find(t => t[0] === selectedTeam)?.[1] || 0;
            if (teamCount >= 4) {
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Los equipos Coyote tienen un límite de 4 integrantes.', type: 'error' } });
                return;
            }
        }

        dispatch({ 
            type: 'ASSIGN_STUDENT_TEAM', 
            payload: { 
                studentId, 
                teamName: assign ? selectedTeam : undefined, 
                isCoyote: isCoyoteMode 
            } 
        });
    };

    const handleCreateTeam = () => {
        const name = window.prompt(`Nuevo equipo ${isCoyoteMode ? 'Coyote' : 'Base'}:`);
        if (name && name.trim()) {
            setSelectedTeam(name.trim());
        }
    };

    return (
        <div className="mt-8 pt-8 border-t border-border-color">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className={`${isCoyoteMode ? 'bg-orange-800' : 'bg-indigo-600'} p-2 rounded-lg text-white transition-colors`}>
                        <Icon name={isCoyoteMode ? "dog" : "users"} className="w-6 h-6"/>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Gestión de Equipos</h2>
                        <p className="text-sm text-text-secondary">Organiza integrantes para proyectos y evaluaciones.</p>
                    </div>
                </div>
                <Button onClick={() => setTeamsModalOpen(true)} className="bg-primary">
                    <Icon name="layout" className="w-4 h-4" /> Abrir Gestor Avanzado
                </Button>
            </div>

            {/* MODAL DEL GESTOR ESPECIAL */}
            <Modal 
                isOpen={isTeamsModalOpen} 
                onClose={() => setTeamsModalOpen(false)} 
                title={`Gestor de Equipos - ${group.name}`}
                size="xl"
            >
                <div className="flex flex-col h-[70vh]">
                    {/* Switch Superior */}
                    <div className="flex items-center justify-center mb-6">
                        <div className="bg-surface-secondary p-1 rounded-xl flex border border-border-color shadow-inner">
                            <button 
                                onClick={() => { setCoyoteMode(false); setSelectedTeam(null); }}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${!isCoyoteMode ? 'bg-white shadow text-indigo-700' : 'text-text-secondary opacity-60'}`}
                            >
                                <Icon name="users" className="w-4 h-4"/> Equipos Base
                            </button>
                            <button 
                                onClick={() => { setCoyoteMode(true); setSelectedTeam(null); }}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${isCoyoteMode ? 'bg-orange-100 shadow text-orange-800' : 'text-text-secondary opacity-60'}`}
                            >
                                <Icon name="dog" className="w-4 h-4"/> Equipos Coyote
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
                        {/* PANEL IZQUIERDO: EQUIPOS */}
                        <div className="md:col-span-4 flex flex-col bg-surface-secondary/50 rounded-xl border border-border-color p-4 overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-sm uppercase tracking-wider text-text-secondary">Equipos Activos</h3>
                                <button 
                                    onClick={handleCreateTeam}
                                    className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                                    title="Crear Equipo"
                                >
                                    <Icon name="plus" className="w-4 h-4"/>
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                {existingTeams.length > 0 ? (
                                    existingTeams.map(([name, count]) => (
                                        <button
                                            key={name}
                                            onClick={() => setSelectedTeam(name)}
                                            className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between group ${
                                                selectedTeam === name 
                                                ? (isCoyoteMode ? 'bg-orange-50 border-orange-400' : 'bg-indigo-50 border-indigo-400')
                                                : 'bg-surface border-transparent hover:border-border-color'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className={`font-bold text-sm truncate ${selectedTeam === name ? (isCoyoteMode ? 'text-orange-900' : 'text-indigo-900') : ''}`}>{name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {isCoyoteMode && <Icon name="footprints" className="w-3 h-3 text-orange-600"/>}
                                                    <span className={`text-[10px] font-bold ${count > (isCoyoteMode ? 4 : 10) ? 'text-accent-red' : 'text-text-secondary opacity-70'}`}>
                                                        {count} {isCoyoteMode ? '/ 4' : 'Integrantes'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm(`¿Disolver equipo "${name}"?`)) {
                                                            dispatch({ type: 'DELETE_TEAM', payload: { teamName: name, isCoyote: isCoyoteMode } });
                                                            if (selectedTeam === name) setSelectedTeam(null);
                                                        }
                                                    }}
                                                    className="p-1 text-accent-red hover:bg-rose-100 rounded"
                                                >
                                                    <Icon name="trash-2" className="w-3.5 h-3.5"/>
                                                </button>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-10 opacity-30">
                                        <Icon name="users" className="w-10 h-10 mx-auto mb-2"/>
                                        <p className="text-xs font-bold uppercase">Sin equipos</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* PANEL DERECHO: ALUMNOS */}
                        <div className="md:col-span-8 flex flex-col overflow-hidden">
                            <div className="mb-4 space-y-3">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Icon name="search" className="h-4 w-4"/>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder={`Buscar en ${isCoyoteMode ? 'todo el cuatrimestre' : 'este grupo'}...`}
                                        className="w-full pl-9 pr-3 py-2.5 border border-border-color rounded-xl bg-surface focus:ring-2 focus:ring-primary text-sm shadow-sm"
                                    />
                                </div>
                                {isCoyoteMode && (
                                    <div className="bg-orange-50 p-2 rounded-lg border border-orange-100 flex items-center gap-2">
                                        <Icon name="info" className="w-4 h-4 text-orange-600"/>
                                        <p className="text-[10px] text-orange-800 font-medium">Estás en modo Coyote: Puedes ver alumnos de todos los grupos de <strong>{group.quarter} cuatrimestre</strong>.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar border border-border-color rounded-xl bg-surface shadow-sm">
                                {!selectedTeam ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                                        <Icon name="arrow-left" className="w-12 h-12 mb-2 animate-pulse"/>
                                        <p className="text-sm font-bold">Selecciona un equipo a la izquierda</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 bg-surface z-10 border-b border-border-color">
                                            <tr className="text-text-secondary uppercase tracking-tighter">
                                                <th className="p-3 w-10">Incl.</th>
                                                <th className="p-3">Nombre del Alumno</th>
                                                <th className="p-3">Grupo Actual</th>
                                                <th className="p-3">Equipo Actual</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-color/50">
                                            {filteredStudents.map(({student, gName}) => {
                                                const isInSelectedTeam = (isCoyoteMode ? student.teamCoyote : student.team) === selectedTeam;
                                                const currentOtherTeam = (isCoyoteMode ? student.teamCoyote : student.team);
                                                
                                                return (
                                                    <tr 
                                                        key={`${student.id}-${gName}`}
                                                        className={`hover:bg-surface-secondary/50 transition-colors ${isInSelectedTeam ? 'bg-indigo-50/20' : ''}`}
                                                    >
                                                        <td className="p-3 text-center">
                                                            <input 
                                                                type="checkbox"
                                                                checked={isInSelectedTeam}
                                                                onChange={(e) => handleAssign(student.id, e.target.checked)}
                                                                className={`h-5 w-5 rounded border-border-color focus:ring-primary ${isCoyoteMode ? 'text-orange-600' : 'text-indigo-600'}`}
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <p className="font-bold text-text-primary">{student.name}</p>
                                                            <p className="text-[10px] text-text-secondary opacity-60">{student.matricula}</p>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${gName === group.name ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                {gName}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            {currentOtherTeam ? (
                                                                <span className={`font-bold text-[10px] ${isInSelectedTeam ? 'text-primary' : 'text-text-secondary opacity-40'}`}>
                                                                    {currentOtherTeam}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const GroupManagement: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, selectedGroupId, settings } = state;
    
    const [isGroupModalOpen, setGroupModalOpen] = useState(false);
    const [isStudentModalOpen, setStudentModalOpen] = useState(false);
    const [isBulkModalOpen, setBulkModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);
    const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Confirmation States ---
    const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<{id: string, name: string} | null>(null);
    const [confirmDeleteStudent, setConfirmDeleteStudent] = useState<{id: string, name: string} | null>(null);
    const [confirmDuplicate, setConfirmDuplicate] = useState<Group | null>(null);
    const [confirmImportCriteria, setConfirmImportCriteria] = useState<{sourceId: string, groupName: string} | null>(null);

    const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
    
    const filteredStudents = useMemo(() => { 
        if (!selectedGroup) return []; 
        if (!searchTerm.trim()) return selectedGroup.students; 
        const search = searchTerm.toLowerCase(); 
        return selectedGroup.students.filter(s => s.name.toLowerCase().includes(search) || s.matricula?.toLowerCase().includes(search) || s.team?.toLowerCase().includes(search)); 
    }, [selectedGroup, searchTerm]);

    const handleSaveGroup = (g: Group) => { 
        dispatch({ type: 'SAVE_GROUP', payload: g }); 
        dispatch({ type: 'ADD_TOAST', payload: { message: `Grupo '${g.name}' guardado.`, type: 'success' } }); 
        setGroupModalOpen(false); 
        setEditingGroup(undefined); 
    };

    const deleteGroupAction = () => {
        if (confirmDeleteGroup) {
            dispatch({ type: 'DELETE_GROUP', payload: confirmDeleteGroup.id });
            dispatch({ type: 'ADD_TOAST', payload: { message: `Grupo '${confirmDeleteGroup.name}' eliminado.`, type: 'info' } });
            setConfirmDeleteGroup(null);
        }
    };

    const duplicateGroupAction = () => {
        if (confirmDuplicate) {
            const ng = { 
                ...confirmDuplicate, 
                id: uuidv4(), 
                name: `Copia de ${confirmDuplicate.name}`, 
                students: confirmDuplicate.students.map(s => ({ ...s, id: uuidv4() })) 
            };
            dispatch({ type: 'SAVE_GROUP', payload: ng });
            dispatch({ type: 'ADD_TOAST', payload: { message: `Copia de '${confirmDuplicate.name}' creada.`, type: 'success' } });
            setConfirmDuplicate(null);
        }
    };

    const handleSaveStudent = (s: Student) => { 
        if (selectedGroupId) { 
            dispatch({ type: 'SAVE_STUDENT', payload: { groupId: selectedGroupId, student: s } }); 
            setStudentModalOpen(false); 
            setEditingStudent(undefined); 
        } 
    };

    const deleteStudentAction = () => {
        if (confirmDeleteStudent && selectedGroupId) {
            dispatch({ type: 'DELETE_STUDENT', payload: { groupId: selectedGroupId, studentId: confirmDeleteStudent.id } });
            dispatch({ type: 'ADD_TOAST', payload: { message: `${confirmDeleteStudent.name} eliminado.`, type: 'info' } });
            setConfirmDeleteStudent(null);
        }
    };

    const importCriteriaAction = () => {
        if (confirmImportCriteria && editingGroup) {
            const sg = groups.find(g => g.id === confirmImportCriteria.sourceId);
            if (sg) {
                const updatedGroup = {
                    ...editingGroup,
                    evaluationTypes: {
                        partial1: sg.evaluationTypes.partial1.map(t => ({...t, id: uuidv4()})),
                        partial2: sg.evaluationTypes.partial2.map(t => ({...t, id: uuidv4()}))
                    }
                };
                setEditingGroup(updatedGroup);
                dispatch({ type: 'ADD_TOAST', payload: { message: `Criterios importados de ${sg.name}.`, type: 'success' } });
            }
            setConfirmImportCriteria(null);
        }
    };

    return (
        <div className="h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4 bg-surface p-4 rounded-xl shadow-sm border border-border-color flex flex-col overflow-hidden max-h-[300px] lg:max-h-full">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-bold">Mis Grupos</h2>
                        <Button size="sm" onClick={() => { setEditingGroup(undefined); setGroupModalOpen(true); }} className="!p-1.5"><Icon name="plus" className="w-4 h-4"/></Button>
                    </div>
                    <ul className="space-y-1.5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                       {groups.map(group => {
                            const isSelected = selectedGroupId === group.id;
                            return (
                            <li key={group.id} onClick={() => dispatch({ type: 'SET_SELECTED_GROUP', payload: group.id })} className={`p-2.5 rounded-lg cursor-pointer transition-all border-l-4 ${isSelected ? 'bg-primary text-white border-transparent' : 'bg-surface-secondary hover:bg-border-color border-transparent'}`}>
                               <div className="flex justify-between items-center">
                                   <div className="min-w-0 flex-1"><p className="font-bold text-sm truncate">{group.name}</p><p className={`text-[10px] truncate ${isSelected ? 'opacity-80' : 'text-text-secondary'}`}>{group.subject}</p></div>
                                   <div className={`flex gap-1.5 shrink-0 ml-2 ${isSelected ? 'text-white' : 'text-text-secondary'}`}>
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmDuplicate(group); }} className="p-1.5 hover:bg-black/10 rounded" title="Duplicar"><Icon name="copy" className="w-3.5 h-3.5"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); setEditingGroup(group); setGroupModalOpen(true); }} className="p-1.5 hover:bg-black/10 rounded" title="Editar"><Icon name="edit-3" className="w-3.5 h-3.5"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteGroup({id: group.id, name: group.name}); }} className="p-1.5 hover:bg-red-500/20 text-accent-red rounded" title="Borrar"><Icon name="trash-2" className="w-3.5 h-3.5"/></button>
                                   </div>
                               </div>
                           </li>
                           );
                        })}
                    </ul>
                </div>

                <div className="lg:col-span-8 bg-surface p-4 rounded-xl shadow-sm border border-border-color flex flex-col overflow-hidden">
                   {selectedGroup ? (
                        <div className="flex flex-col h-full overflow-hidden">
                            <div className="mb-4 space-y-3">
                                <div className="flex items-center justify-between"><h2 className="text-xl font-bold truncate">{selectedGroup.name}</h2><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setBulkModalOpen(true)} className="!p-1.5"><Icon name="list-plus" className="w-4 h-4"/></Button><Button size="sm" onClick={() => { setEditingStudent(undefined); setStudentModalOpen(true); }} className="!p-1.5"><Icon name="user-plus" className="w-4 h-4"/></Button></div></div>
                                <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Icon name="search" className="h-4 w-4"/></div><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar alumno..." className="w-full pl-9 pr-3 py-1.5 border border-border-color rounded-md bg-surface text-sm focus:ring-1 focus:ring-primary"/></div>
                            </div>
                            <div className="overflow-auto flex-1 custom-scrollbar max-h-[400px]">
                                <table className="w-full text-left text-xs">
                                    <thead className="sticky top-0 bg-surface z-10"><tr className="border-b border-border-color text-text-secondary"><th className="p-2 w-8">#</th>{settings.showMatricula && <th className="p-2">Matrícula</th>}<th className="p-2">Nombre</th><th className="p-2">Equipo Base</th><th className="p-2">Coyote</th><th className="p-2 text-right">Acción</th></tr></thead>
                                    <tbody>
                                        {filteredStudents.map((s, i) => (
                                            <tr key={s.id} className="border-b border-border-color/50 hover:bg-surface-secondary/40">
                                                <td className="p-2 text-text-secondary font-medium">{i + 1}</td>
                                                {settings.showMatricula && <td className="p-2 opacity-70">{s.matricula || '-'}</td>}
                                                <td className="p-2 font-bold flex items-center gap-1.5 truncate">{s.name}{s.isRepeating && <span className="bg-rose-600 text-white text-[8px] px-1 rounded-full shrink-0">R</span>}</td>
                                                <td className="p-2 truncate">
                                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">{s.team || '-'}</span>
                                                </td>
                                                <td className="p-2 truncate">
                                                    {s.teamCoyote && (
                                                        <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-bold border border-orange-200">
                                                            <Icon name="dog" className="inline w-2.5 h-2.5 mr-0.5"/>{s.teamCoyote}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-right whitespace-nowrap"><button onClick={() => { setEditingStudent(s); setStudentModalOpen(true); }} className="p-1.5 text-text-secondary hover:text-primary rounded"><Icon name="edit-3" className="w-3.5 h-3.5"/></button><button onClick={() => { setConfirmDeleteStudent({id: s.id, name: s.name}); }} className="p-1.5 text-accent-red hover:bg-accent-red-light rounded ml-1"><Icon name="trash-2" className="w-3.5 h-3.5"/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                   ) : (<div className="flex-1 flex flex-col items-center justify-center py-20 opacity-40"><Icon name="users" className="w-16 h-16"/><p className="mt-2 text-sm">Selecciona un grupo.</p></div>)}
                </div>
            </div>

            {selectedGroup && <TeamsManager group={selectedGroup} />}

            <Modal isOpen={isGroupModalOpen} onClose={() => setGroupModalOpen(false)} title={editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'} size="xl">
                <GroupForm 
                    group={editingGroup} 
                    existingGroups={groups} 
                    onSave={handleSaveGroup} 
                    onCancel={() => setGroupModalOpen(false)} 
                    onImportCriteria={(sourceId) => setConfirmImportCriteria({sourceId, groupName: groups.find(g => g.id === sourceId)?.name || ''})}
                />
            </Modal>
            <Modal isOpen={isStudentModalOpen} onClose={() => setStudentModalOpen(false)} title={editingStudent ? 'Editar Alumno' : 'Nuevo Alumno'}><StudentForm student={editingStudent} currentGroup={selectedGroup} allGroups={groups} onSave={handleSaveStudent} onCancel={() => setStudentModalOpen(false)} /></Modal>
            <Modal isOpen={isBulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Importar Varios Alumnos" size="lg">
                <BulkStudentForm 
                    onSave={(students) => {
                        if (selectedGroupId) {
                            dispatch({ type: 'BULK_ADD_STUDENTS', payload: { groupId: selectedGroupId, students } });
                            setBulkModalOpen(false);
                            dispatch({ type: 'ADD_TOAST', payload: { message: `${students.length} alumnos agregados.`, type: 'success' } });
                        }
                    }} 
                    onCancel={() => setBulkModalOpen(false)} 
                />
            </Modal>

            {/* --- All Confirmation Modals for this view --- */}
            <ConfirmationModal
                isOpen={!!confirmDeleteGroup}
                onClose={() => setConfirmDeleteGroup(null)}
                onConfirm={deleteGroupAction}
                title="Eliminar Grupo"
                variant="danger"
                confirmText="Eliminar"
            >
                ¿Estás seguro de que quieres eliminar el grupo <strong>"{confirmDeleteGroup?.name}"</strong>? 
                <p className="mt-2 text-xs opacity-70">Se perderán todas las asistencias y calificaciones registradas de este grupo.</p>
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={!!confirmDeleteStudent}
                onClose={() => setConfirmDeleteStudent(null)}
                onConfirm={deleteStudentAction}
                title="Eliminar Alumno"
                variant="danger"
                confirmText="Eliminar"
            >
                ¿Deseas eliminar a <strong>{confirmDeleteStudent?.name}</strong> de este grupo?
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={!!confirmDuplicate}
                onClose={() => setConfirmDuplicate(null)}
                onConfirm={duplicateGroupAction}
                title="Duplicar Grupo"
                confirmText="Duplicar"
            >
                ¿Deseas crear una copia del grupo <strong>"{confirmDuplicate?.name}"</strong>? 
                <p className="mt-2 text-xs opacity-70">Se copiará la lista de alumnos y criterios de evaluación, pero no el historial de asistencias.</p>
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={!!confirmImportCriteria}
                onClose={() => setConfirmImportCriteria(null)}
                onConfirm={importCriteriaAction}
                title="Importar Criterios"
                confirmText="Importar"
            >
                ¿Deseas importar los criterios de evaluación del grupo <strong>"{confirmImportCriteria?.groupName}"</strong>?
                <p className="mt-2 text-xs opacity-70">Esto reemplazará los criterios que hayas configurado en el formulario actual.</p>
            </ConfirmationModal>
        </div>
    );
};

export default GroupManagement;
