
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Group, Student, DayOfWeek, EvaluationType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
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

export const GroupForm: React.FC<{ group?: Group; existingGroups?: Group[]; onSave: (group: Group) => void; onCancel: () => void; }> = ({ group, existingGroups = [], onSave, onCancel }) => {
    const [name, setName] = useState(group?.name || ''), [subject, setSubject] = useState(group?.subject || ''), [subjectShortName, setSubjectShortName] = useState(group?.subjectShortName || ''), [quarter, setQuarter] = useState(group?.quarter || ''), [classDays, setClassDays] = useState<DayOfWeek[]>(group?.classDays || []), [color, setColor] = useState(group?.color || GROUP_COLORS[0].name);
    const [p1Types, setP1Types] = useState<EvaluationType[]>(group?.evaluationTypes?.partial1 || [{ id: uuidv4(), name: 'General', weight: 100 }]), [p2Types, setP2Types] = useState<EvaluationType[]>(group?.evaluationTypes?.partial2 || [{ id: uuidv4(), name: 'General', weight: 100 }]);
    const handleDayToggle = (day: DayOfWeek) => setClassDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    const handleImportCriteria = (sid: string) => {
        const sg = existingGroups.find(g => g.id === sid); if (!sg) return;
        if (window.confirm(`¿Importar criterios de "${sg.name}"?`)) { setP1Types(sg.evaluationTypes.partial1.map(t => ({...t, id: uuidv4()}))); setP2Types(sg.evaluationTypes.partial2.map(t => ({...t, id: uuidv4()}))); }
    };
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
                <div className="flex justify-between items-center"><label className="text-sm font-bold">Ponderación</label>{existingGroups.length > 0 && <select className="text-[10px] p-1 border border-border-color rounded bg-surface focus:ring-1 focus:ring-primary" onChange={e => { if(e.target.value) { handleImportCriteria(e.target.value); e.target.value = ""; } }} defaultValue=""><option value="" disabled>Copiar de...</option>{existingGroups.filter(g => g.id !== group?.id).map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}</select>}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><EvaluationTypesEditor types={p1Types} onTypesChange={setP1Types} partialName="Parcial 1" /><EvaluationTypesEditor types={p2Types} onTypesChange={setP2Types} partialName="Parcial 2" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="secondary" onClick={onCancel} size="sm">Cancelar</Button><Button type="submit" size="sm">{group ? 'Guardar' : 'Crear'}</Button></div>
        </form>
    );
};

const StudentForm: React.FC<{ student?: Student; currentGroup?: Group; allGroups?: Group[]; onSave: (student: Student) => void; onCancel: () => void; }> = ({ student, currentGroup, allGroups = [], onSave, onCancel }) => {
    const [name, setName] = useState(student?.name || ''), [matricula, setMatricula] = useState(student?.matricula || ''), [nickname, setNickname] = useState(student?.nickname || ''), [isRepeating, setIsRepeating] = useState(student?.isRepeating || false), [team, setTeam] = useState(student?.team || '');
    const suggestedTeams = useMemo(() => { if (!currentGroup || !currentGroup.quarter) return []; const teams = new Set<string>(); allGroups.forEach(g => { if (g.quarter === currentGroup.quarter) g.students.forEach(s => { if (s.team) teams.add(s.team); }); }); return Array.from(teams).sort(); }, [allGroups, currentGroup]);
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!name) return; onSave({ id: student?.id || uuidv4(), name, matricula, nickname, isRepeating, team: team.trim() || undefined }); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-xs font-medium">Nombre Completo</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium">Matrícula</label><input type="text" value={matricula} onChange={e => setMatricula(e.target.value)} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
                <div><label className="block text-xs font-medium text-primary">Equipo</label><input list="quarter-teams" value={team} onChange={e => setTeam(e.target.value)} placeholder="Ej. Equipo 1" className="mt-1 w-full p-2 border border-primary/30 rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/><datalist id="quarter-teams">{suggestedTeams.map(t => <option key={t} value={t}/>)}</datalist></div>
            </div>
            <div><label className="block text-xs font-medium">Apodo (Opcional)</label><input type="text" value={nickname} onChange={e => setNickname(e.target.value)} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
            <div className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-900/40"><input type="checkbox" id="isRepeating" checked={isRepeating} onChange={e => setIsRepeating(e.target.checked)} className="h-5 w-5 rounded text-rose-600 focus:ring-rose-500"/><label htmlFor="isRepeating" className="text-sm font-bold text-rose-700 dark:text-rose-400 cursor-pointer">¿Es de RECURSAMIENTO?</label></div>
            <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="secondary" onClick={onCancel} size="sm">Cancelar</Button><Button type="submit" size="sm">{student ? 'Guardar' : 'Agregar'}</Button></div>
        </form>
    );
};

// --- TEAM MANAGEMENT COMPONENTS ---

const INDIVIDUAL_TEAM_NAME = "_INDIVIDUAL_";

const TeamsManager: React.FC<{ group: Group }> = ({ group }) => {
    const { state, dispatch } = useContext(AppContext);
    const { groups } = state;
    const [editingTeamName, setEditingTeamName] = useState<{ original: string, current: string } | null>(null);

    // Filter students from the CURRENT group who have no team
    const unassignedStudents = useMemo(() => 
        group.students.filter(s => !s.team || s.team.trim() === ''),
    [group.students]);

    // Aggregate ALL students from ALL groups to find cross-group team members
    const teamsData = useMemo(() => {
        const teamsMap: { [name: string]: { members: { student: Student, groupName: string }[] } } = {};
        
        groups.forEach(g => {
            g.students.forEach(s => {
                if (s.team && s.team.trim() !== '') {
                    if (!teamsMap[s.team]) teamsMap[s.team] = { members: [] };
                    teamsMap[s.team].members.push({ student: s, groupName: g.name });
                }
            });
        });
        
        return Object.entries(teamsMap).sort(([a], [b]) => a.localeCompare(b));
    }, [groups]);

    const handleRenameTeam = (oldName: string, newName: string) => {
        if (!newName.trim() || oldName === newName) {
            setEditingTeamName(null);
            return;
        }
        dispatch({ type: 'RENAME_TEAM', payload: { oldName, newName } });
        setEditingTeamName(null);
    };

    const handleDeleteTeam = (name: string) => {
        if (window.confirm(`¿Disolver el equipo "${name}"? Los integrantes volverán a estar sin equipo.`)) {
            dispatch({ type: 'DELETE_TEAM', payload: name });
        }
    };

    const handleAssignTeam = (studentId: string, teamName: string | undefined) => {
        dispatch({ type: 'ASSIGN_STUDENT_TEAM', payload: { studentId, teamName } });
    };

    return (
        <div className="mt-8 pt-8 border-t border-border-color">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-600 p-2 rounded-lg text-white">
                    <Icon name="users" className="w-6 h-6"/>
                </div>
                <div>
                    <h2 className="text-2xl font-bold">Gestión Estratégica de Equipos</h2>
                    <p className="text-sm text-text-secondary">Organiza integrantes y visualiza equipos compartidos entre grupos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* UNASSIGNED PANEL (Waiting Room) */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className="bg-surface p-4 rounded-xl border-2 border-dashed border-border-color shadow-sm h-full max-h-[500px]">
                        <div className="flex items-center justify-between mb-4 border-b border-border-color pb-2">
                            <h3 className="font-bold flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-red opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-red"></span>
                                </span>
                                Alumnos sin equipo ({unassignedStudents.length})
                            </h3>
                        </div>
                        <div className="overflow-y-auto flex-1 custom-scrollbar pr-1 space-y-2">
                            {unassignedStudents.length > 0 ? (
                                unassignedStudents.map(s => (
                                    <motion.div 
                                        layout
                                        key={s.id} 
                                        className="p-3 bg-surface-secondary rounded-lg border border-border-color flex items-center justify-between group hover:border-primary transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm truncate">{s.name}</p>
                                            <p className="text-[10px] text-text-secondary">{s.matricula}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => handleAssignTeam(s.id, INDIVIDUAL_TEAM_NAME)}
                                                className="p-1.5 text-text-secondary hover:text-slate-600 hover:bg-slate-200 rounded-md transition-all"
                                                title="Trabaja solo"
                                            >
                                                <Icon name="user-plus" className="w-4 h-4"/>
                                            </button>
                                            <div className="relative group/menu">
                                                <button className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-all">
                                                    <Icon name="plus" className="w-4 h-4"/>
                                                </button>
                                                {/* Quick team assign menu */}
                                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover/menu:block bg-surface border border-border-color shadow-xl rounded-lg py-2 w-48 z-50">
                                                    <p className="px-3 py-1 text-[10px] font-bold text-text-secondary uppercase border-b border-border-color mb-1">Asignar a...</p>
                                                    <div className="max-h-40 overflow-y-auto px-1">
                                                        <button 
                                                            onClick={() => {
                                                                const name = window.prompt("Nombre del nuevo equipo:");
                                                                if (name) handleAssignTeam(s.id, name);
                                                            }}
                                                            className="w-full text-left px-2 py-1.5 text-xs hover:bg-primary/10 text-primary font-bold flex items-center gap-2 rounded"
                                                        >
                                                            <Icon name="plus" className="w-3 h-3"/> Nuevo Equipo
                                                        </button>
                                                        {teamsData.filter(([name]) => name !== INDIVIDUAL_TEAM_NAME).map(([name]) => (
                                                            <button 
                                                                key={name}
                                                                onClick={() => handleAssignTeam(s.id, name)}
                                                                className="w-full text-left px-2 py-1.5 text-xs hover:bg-surface-secondary rounded transition-colors truncate"
                                                            >
                                                                {name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-center py-10 opacity-30">
                                    <Icon name="check-circle-2" className="w-12 h-12 mx-auto mb-2"/>
                                    <p className="text-sm font-bold">Todos tienen equipo</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* TEAMS GRID */}
                <div className="lg:col-span-8">
                    <div className="flex flex-wrap gap-4 content-start">
                        <AnimatePresence>
                            {teamsData.map(([name, data]) => {
                                const isIndividual = name === INDIVIDUAL_TEAM_NAME;
                                const isCurrentTeamEditing = editingTeamName?.original === name;
                                
                                return (
                                    <motion.div 
                                        layout
                                        key={name} 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className={`min-w-[280px] flex-1 max-w-sm rounded-xl border-2 shadow-sm flex flex-col ${
                                            isIndividual ? 'bg-slate-50 border-slate-200' : 'bg-surface border-indigo-100'
                                        }`}
                                    >
                                        <div className={`p-3 border-b flex items-center justify-between ${
                                            isIndividual ? 'border-slate-200 bg-slate-100/50' : 'border-indigo-50 bg-indigo-50/30'
                                        }`}>
                                            <div className="flex-1 min-w-0 mr-2">
                                                {isCurrentTeamEditing ? (
                                                    <input 
                                                        autoFocus
                                                        className="w-full text-sm font-bold p-1 rounded border border-primary focus:ring-1 focus:ring-primary"
                                                        value={editingTeamName.current}
                                                        onChange={e => setEditingTeamName({ ...editingTeamName, current: e.target.value })}
                                                        onBlur={() => handleRenameTeam(name, editingTeamName.current)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleRenameTeam(name, editingTeamName.current);
                                                            if (e.key === 'Escape') setEditingTeamName(null);
                                                        }}
                                                    />
                                                ) : (
                                                    <h4 className={`text-sm font-bold truncate flex items-center gap-2 ${isIndividual ? 'text-slate-600' : 'text-indigo-800'}`}>
                                                        <Icon name={isIndividual ? "user" : "users"} className="w-4 h-4 shrink-0"/>
                                                        {isIndividual ? "Trabajo Individual" : name}
                                                    </h4>
                                                )}
                                            </div>
                                            {!isIndividual && (
                                                <div className="flex gap-1 shrink-0">
                                                    <button onClick={() => setEditingTeamName({ original: name, current: name })} className="p-1 text-slate-400 hover:text-primary rounded hover:bg-white transition-all"><Icon name="edit-3" className="w-3.5 h-3.5"/></button>
                                                    <button onClick={() => handleDeleteTeam(name)} className="p-1 text-slate-400 hover:text-accent-red rounded hover:bg-white transition-all"><Icon name="trash-2" className="w-3.5 h-3.5"/></button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                            {data.members.map(({ student, groupName }) => (
                                                <div key={student.id} className="flex items-center justify-between group/member text-xs">
                                                    <div className="min-w-0">
                                                        <p className="font-semibold truncate">{student.name}</p>
                                                        <p className={`text-[9px] ${groupName === group.name ? 'font-bold text-primary' : 'text-text-secondary opacity-70'}`}>
                                                            {groupName}
                                                        </p>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleAssignTeam(student.id, undefined)}
                                                        className="opacity-0 group-hover/member:opacity-100 p-1 text-text-secondary hover:text-accent-red transition-all"
                                                        title="Quitar del equipo"
                                                    >
                                                        <Icon name="x" className="w-3 h-3"/>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className={`p-2 text-center text-[10px] font-bold border-t ${
                                            isIndividual ? 'border-slate-200 text-slate-400' : 'border-indigo-50 text-indigo-400'
                                        }`}>
                                            {data.members.length} Integrantes
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GroupManagement: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, selectedGroupId, settings } = state;
    const [isGroupModalOpen, setGroupModalOpen] = useState(false), [isStudentModalOpen, setStudentModalOpen] = useState(false), [isBulkModalOpen, setBulkModalOpen] = useState(false), [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined), [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined), [searchTerm, setSearchTerm] = useState('');
    const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
    const filteredStudents = useMemo(() => { if (!selectedGroup) return []; if (!searchTerm.trim()) return selectedGroup.students; const search = searchTerm.toLowerCase(); return selectedGroup.students.filter(s => s.name.toLowerCase().includes(search) || s.matricula?.toLowerCase().includes(search) || s.team?.toLowerCase().includes(search)); }, [selectedGroup, searchTerm]);
    const handleSaveGroup = (g: Group) => { dispatch({ type: 'SAVE_GROUP', payload: g }); dispatch({ type: 'ADD_TOAST', payload: { message: `Grupo '${g.name}' guardado.`, type: 'success' } }); setGroupModalOpen(false); setEditingGroup(undefined); };
    const handleDeleteGroup = (id: string, n: string) => { if (window.confirm(`¿Eliminar grupo "${n}"?`)) { dispatch({ type: 'DELETE_GROUP', payload: id }); dispatch({ type: 'ADD_TOAST', payload: { message: `Grupo '${n}' eliminado.`, type: 'info' } }); } };
    const handleDuplicateGroup = (g: Group) => { const ng = { ...g, id: uuidv4(), name: `Copia de ${g.name}`, students: g.students.map(s => ({ ...s, id: uuidv4() })) }; dispatch({ type: 'SAVE_GROUP', payload: ng }); dispatch({ type: 'ADD_TOAST', payload: { message: `Copia creada.`, type: 'success' } }); };
    const handleSaveStudent = (s: Student) => { if (selectedGroupId) { dispatch({ type: 'SAVE_STUDENT', payload: { groupId: selectedGroupId, student: s } }); setStudentModalOpen(false); setEditingStudent(undefined); } };
    const handleDeleteStudent = (sid: string, n: string) => { if (selectedGroupId && window.confirm(`¿Eliminar a ${n}?`)) { dispatch({ type: 'DELETE_STUDENT', payload: { groupId: selectedGroupId, studentId: sid } }); dispatch({ type: 'ADD_TOAST', payload: { message: `${n} eliminado.`, type: 'info' } }); } };

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
                                        <button onClick={(e) => { e.stopPropagation(); handleDuplicateGroup(group); }} className="p-1.5 hover:bg-black/10 rounded" title="Duplicar"><Icon name="copy" className="w-3.5 h-3.5"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); setEditingGroup(group); setGroupModalOpen(true); }} className="p-1.5 hover:bg-black/10 rounded" title="Editar"><Icon name="edit-3" className="w-3.5 h-3.5"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id, group.name); }} className="p-1.5 hover:bg-red-500/20 text-accent-red rounded" title="Borrar"><Icon name="trash-2" className="w-3.5 h-3.5"/></button>
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
                                    <thead className="sticky top-0 bg-surface z-10"><tr className="border-b border-border-color text-text-secondary"><th className="p-2 w-8">#</th>{settings.showMatricula && <th className="p-2">Matrícula</th>}<th className="p-2">Nombre</th><th className="p-2">Equipo</th><th className="p-2 text-right">Acción</th></tr></thead>
                                    <tbody>
                                        {filteredStudents.map((s, i) => (
                                            <tr key={s.id} className="border-b border-border-color/50 hover:bg-surface-secondary/40">
                                                <td className="p-2 text-text-secondary font-medium">{i + 1}</td>
                                                {settings.showMatricula && <td className="p-2 opacity-70">{s.matricula || '-'}</td>}
                                                <td className="p-2 font-bold flex items-center gap-1.5 truncate">{s.name}{s.isRepeating && <span className="bg-rose-600 text-white text-[8px] px-1 rounded-full shrink-0">R</span>}</td>
                                                <td className="p-2 truncate">
                                                    {s.team === INDIVIDUAL_TEAM_NAME ? (
                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold border border-slate-200">Solo</span>
                                                    ) : (
                                                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">{s.team || '-'}</span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-right whitespace-nowrap"><button onClick={() => { setEditingStudent(s); setStudentModalOpen(true); }} className="p-1.5 text-text-secondary hover:text-primary rounded"><Icon name="edit-3" className="w-3.5 h-3.5"/></button><button onClick={() => { handleDeleteStudent(s.id, s.name); }} className="p-1.5 text-accent-red hover:bg-accent-red-light rounded ml-1"><Icon name="trash-2" className="w-3.5 h-3.5"/></button></td>
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

            <Modal isOpen={isGroupModalOpen} onClose={() => setGroupModalOpen(false)} title={editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'} size="xl"><GroupForm group={editingGroup} existingGroups={groups} onSave={handleSaveGroup} onCancel={() => setGroupModalOpen(false)} /></Modal>
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
        </div>
    );
};

export default GroupManagement;
