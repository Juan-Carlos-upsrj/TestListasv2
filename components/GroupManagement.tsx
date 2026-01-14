
import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Group, Student, DayOfWeek, EvaluationType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import ConfirmationModal from './common/ConfirmationModal';
import { DAYS_OF_WEEK, GROUP_COLORS } from '../constants';

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
    
    useEffect(() => {
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
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Cuatrimestre</label><input type="text" placeholder="Ej. 5º" value={quarter} onChange={e => setQuarter(e.target.value)} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Materia</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} required className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Abrev. Materia</label><input type="text" value={subjectShortName} onChange={e => setSubjectShortName(e.target.value)} maxLength={8} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary font-bold"/></div>
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
    
    const suggestedTeams = useMemo(() => { 
        if (!currentGroup || !currentGroup.quarter) return []; 
        const teams = new Set<string>(); 
        allGroups.forEach(g => { 
            if (g && g.quarter === currentGroup.quarter) g.students.forEach(s => { 
                if (s && s.team) teams.add(s.team); 
            }); 
        }); 
        return Array.from(teams).sort(); 
    }, [allGroups, currentGroup]);

    const handleSubmit = (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (!name) return; 
        
        onSave({ 
            ...student, 
            id: student?.id || uuidv4(), 
            name, 
            matricula, 
            nickname, 
            isRepeating, 
            team: team.trim() || student?.team || undefined 
        }); 
    };

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

// --- TEAM MANAGEMENT COMPONENT ---

const TeamsManager: React.FC<{ group: Group }> = ({ group }) => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, teamNotes = {}, coyoteTeamNotes = {} } = state;
    
    const [isCoyoteMode, setCoyoteMode] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isTeamsModalOpen, setTeamsModalOpen] = useState(false);
    const [isMigrateModalOpen, setMigrateModalOpen] = useState(false);

    // --- REEMPLAZO DE PROMPTS Y CONFIRMS ---
    const [isNameModalOpen, setNameModalOpen] = useState(false);
    const [nameModalTitle, setNameModalTitle] = useState('');
    const [nameInputValue, setNameInputValue] = useState('');
    const [nameModalAction, setNameModalAction] = useState<'create' | 'rename'>('create');
    const [teamToDelete, setTeamToDelete] = useState<{name: string, isCoyote: boolean} | null>(null);
    const [teamToConvert, setTeamToConvert] = useState<{name: string, isCoyote: boolean} | null>(null);
    
    // --- GENERADOR ALEATORIO ---
    const [isRandomModalOpen, setRandomModalOpen] = useState(false);
    const [randomSize, setRandomSize] = useState(4);

    // Estado para equipos que se acaban de crear y no tienen alumnos aún
    const [tempTeams, setTempTeams] = useState<string[]>([]);

    useEffect(() => {
        setTempTeams([]);
        setSelectedTeam(null);
    }, [isCoyoteMode, group.id]);

    const currentNote = useMemo(() => {
        if (!selectedTeam) return '';
        return isCoyoteMode ? (coyoteTeamNotes[selectedTeam] || '') : (teamNotes[selectedTeam] || '');
    }, [selectedTeam, isCoyoteMode, teamNotes, coyoteTeamNotes]);

    const handleNoteChange = (val: string) => {
        if (!selectedTeam) return;
        dispatch({ type: 'UPDATE_TEAM_NOTE', payload: { teamName: selectedTeam, note: val, isCoyote: isCoyoteMode } });
    };

    const studentsList = useMemo(() => {
        if (isCoyoteMode) {
            const allQuarterStudents: {student: Student, gName: string}[] = [];
            groups.filter(g => g && g.quarter === group.quarter).forEach(g => {
                (g.students || []).filter(Boolean).forEach(s => allQuarterStudents.push({student: s, gName: g.name}));
            });
            return allQuarterStudents;
        } else {
            return (group.students || []).filter(Boolean).map(s => ({student: s, gName: group.name}));
        }
    }, [groups, group, isCoyoteMode]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm.trim()) return studentsList;
        const s = searchTerm.toLowerCase();
        return studentsList.filter(item => 
            item.student?.name?.toLowerCase().includes(s) || 
            item.student?.matricula?.toLowerCase().includes(s) ||
            item.student?.team?.toLowerCase().includes(s) ||
            item.student?.teamCoyote?.toLowerCase().includes(s)
        );
    }, [studentsList, searchTerm]);

    const existingTeams = useMemo(() => {
        const teamsMap = new Map<string, number>();
        if (isCoyoteMode) {
            studentsList.forEach(item => {
                const tc = item.student?.teamCoyote;
                if (tc) teamsMap.set(tc, (teamsMap.get(tc) || 0) + 1);
            });
        } else {
            (group.students || []).filter(Boolean).forEach(s => {
                const t = s?.team;
                if (t) teamsMap.set(t, (teamsMap.get(t) || 0) + 1);
            });
        }
        tempTeams.forEach(t => { if (!teamsMap.has(t)) teamsMap.set(t, 0); });
        return Array.from(teamsMap.entries()).sort((a,b) => a[0].localeCompare(b[0]));
    }, [studentsList, isCoyoteMode, tempTeams]);

    const allBaseTeamsForQuarter = useMemo(() => {
        const teamsMap = new Map<string, string[]>();
        groups.filter(g => g && g.quarter === group.quarter).forEach(g => {
            (g.students || []).filter(Boolean).forEach(s => {
                if (s?.team) {
                    const members = teamsMap.get(s.team) || [];
                    members.push(s.id);
                    teamsMap.set(s.team, members);
                }
            });
        });
        return Array.from(teamsMap.entries()).sort();
    }, [groups, group.quarter]);

    const handleAssign = (studentId: string, assign: boolean) => {
        if (!selectedTeam) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Primero selecciona un equipo.', type: 'info' } });
            return;
        }
        if (assign && isCoyoteMode) {
            const teamCount = existingTeams.find(t => t[0] === selectedTeam)?.[1] || 0;
            if (teamCount >= 4) {
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Límite de 4 integrantes alcanzado.', type: 'error' } });
                return;
            }
        }
        dispatch({ type: 'ASSIGN_STUDENT_TEAM', payload: { studentId, teamName: assign ? selectedTeam : undefined, isCoyote: isCoyoteMode } });
        if (assign) setTempTeams(prev => prev.filter(t => t !== selectedTeam));
    };

    const handleMigrateTeam = (_baseTeamName: string, memberIds: string[]) => {
        if (!selectedTeam) return;
        const currentCount = existingTeams.find(t => t[0] === selectedTeam)?.[1] || 0;
        const availableSlots = 4 - currentCount;
        if (memberIds.length > availableSlots) {
            dispatch({ type: 'ADD_TOAST', payload: { message: `Falta espacio: ${memberIds.length} integrantes vs ${availableSlots} lugares.`, type: 'error' } });
            return;
        }
        memberIds.forEach(sid => dispatch({ type: 'ASSIGN_STUDENT_TEAM', payload: { studentId: sid, teamName: selectedTeam, isCoyote: true } }));
        setTempTeams(prev => prev.filter(t => t !== selectedTeam));
        dispatch({ type: 'ADD_TOAST', payload: { message: `Equipo migrado con éxito.`, type: 'success' } });
        setMigrateModalOpen(false);
    };

    const openCreateTeamModal = () => {
        setNameModalTitle(`Nuevo Equipo ${isCoyoteMode ? 'Coyote' : 'Base'}`);
        setNameInputValue('');
        setNameModalAction('create');
        setNameModalOpen(true);
    };

    const handleNameModalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = nameInputValue.trim();
        if (!trimmed) return;
        if (nameModalAction === 'create') {
            if (existingTeams.some(t => t[0].toLowerCase() === trimmed.toLowerCase())) {
                setSelectedTeam(trimmed);
            } else {
                setTempTeams(prev => [...prev, trimmed]);
                setSelectedTeam(trimmed);
            }
        } else {
            if (trimmed !== selectedTeam) {
                dispatch({ type: 'RENAME_TEAM', payload: { oldName: selectedTeam!, newName: trimmed, isCoyote: isCoyoteMode } });
                setTempTeams(prev => prev.map(t => t === selectedTeam ? trimmed : t));
                setSelectedTeam(trimmed);
            }
        }
        setNameModalOpen(false);
    };

    const executeDeleteTeam = () => {
        if (teamToDelete) {
            dispatch({ type: 'DELETE_TEAM', payload: { teamName: teamToDelete.name, isCoyote: teamToDelete.isCoyote } });
            setTempTeams(prev => prev.filter(t => t !== teamToDelete.name));
            if (selectedTeam === teamToDelete.name) setSelectedTeam(null);
            setTeamToDelete(null);
        }
    };

    const executeConvertTeam = () => {
        if (teamToConvert) {
            dispatch({ type: 'CONVERT_TEAM_TYPE', payload: { teamName: teamToConvert.name, fromCoyote: teamToConvert.isCoyote, groupId: group.id } });
            setCoyoteMode(!teamToConvert.isCoyote);
            setSelectedTeam(teamToConvert.name);
            dispatch({ type: 'ADD_TOAST', payload: { message: `Equipo convertido a ${!teamToConvert.isCoyote ? 'Coyote' : 'Base'}.`, type: 'success' } });
            setTeamToConvert(null);
        }
    };

    const executeRandomTeams = () => {
        dispatch({ type: 'GENERATE_RANDOM_TEAMS', payload: { groupId: group.id, maxTeamSize: randomSize } });
        setRandomModalOpen(false);
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Equipos generados aleatoriamente.', type: 'success' } });
    };

    return (
        <>
            <Button size="sm" onClick={() => setTeamsModalOpen(true)} className="!p-1.5" title="Gestión de Equipos">
                <Icon name="users" className="w-5 h-5"/>
            </Button>

            <Modal isOpen={isTeamsModalOpen} onClose={() => setTeamsModalOpen(false)} title={`Gestor de Equipos - ${group.name}`} size="6xl">
                <div className="flex flex-col h-[78vh]">
                    <div className="flex items-center justify-center mb-6 shrink-0">
                        <div className="bg-surface-secondary p-1.5 rounded-2xl flex border border-border-color shadow-inner scale-90 sm:scale-100">
                            <button onClick={() => setCoyoteMode(false)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${!isCoyoteMode ? 'bg-white shadow-md text-indigo-700' : 'text-text-secondary opacity-60'}`}><Icon name="users" className="w-4 h-4"/> Equipos Base</button>
                            <button onClick={() => setCoyoteMode(true)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${isCoyoteMode ? 'bg-orange-100 shadow-md text-orange-800' : 'text-text-secondary opacity-60'}`}><Icon name="dog" className="w-4 h-4"/> Equipos Coyote</button>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
                        <div className="md:col-span-4 lg:col-span-3 flex flex-col bg-surface-secondary/50 rounded-2xl border border-border-color p-4 overflow-hidden shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-[10px] uppercase tracking-widest text-text-secondary">Equipos Activos</h3>
                                <div className="flex gap-1">
                                    {!isCoyoteMode && (
                                        <button onClick={() => setRandomModalOpen(true)} className="p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 shadow-md active:scale-95 transition-all" title="Generar Aleatorios"><Icon name="camera" className="w-4 h-4" /></button>
                                    )}
                                    <button onClick={openCreateTeamModal} className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover shadow-md active:scale-95 transition-all" title="Crear Nuevo Equipo"><Icon name="plus" className="w-4 h-4"/></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                                {existingTeams.length > 0 ? existingTeams.map(([name, count]) => (
                                    <button key={name} onClick={() => setSelectedTeam(name)} className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between group ${selectedTeam === name ? (isCoyoteMode ? 'bg-orange-50 border-orange-500 shadow-md' : 'bg-indigo-50 border-indigo-500 shadow-md') : 'bg-surface border-transparent hover:border-border-color shadow-sm'}`}>
                                        <div className="min-w-0 flex-1">
                                            <p className={`font-bold text-sm truncate ${selectedTeam === name ? (isCoyoteMode ? 'text-orange-900' : 'text-indigo-900') : ''}`}>{name}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5 opacity-60"><Icon name="users" className="w-3 h-3"/><span className="text-[10px] font-bold uppercase">{count} {isCoyoteMode ? '/ 4' : 'Alumnos'}</span></div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setTeamToDelete({name, isCoyote: isCoyoteMode}); }} className="p-1.5 text-accent-red hover:bg-rose-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="trash-2" className="w-3.5 h-3.5"/></button>
                                    </button>
                                )) : <div className="text-center py-10 opacity-30"><p className="text-[10px] font-black uppercase tracking-widest">Sin equipos</p></div>}
                            </div>
                        </div>

                        <div className="md:col-span-8 lg:col-span-9 flex flex-col overflow-hidden">
                            {!selectedTeam ? (
                                <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-border-color opacity-50 p-8 text-center"><Icon name="arrow-left" className="w-12 h-12 mb-4 text-slate-300 animate-pulse"/><h4 className="text-xl font-black text-slate-400">Selecciona un equipo</h4><p className="text-sm text-slate-400 mt-2">Para asignar alumnos o escribir notas.</p></div>
                            ) : (
                                <div className="flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                    <div className={`p-4 rounded-2xl border-2 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 ${isCoyoteMode ? 'bg-orange-50/50 border-orange-200' : 'bg-indigo-50/50 border-indigo-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl text-white ${isCoyoteMode ? 'bg-orange-600' : 'bg-indigo-600'}`}><Icon name={isCoyoteMode ? "dog" : "users"} className="w-5 h-5"/></div>
                                            <div><h4 className="text-lg font-black">{selectedTeam}</h4><p className="text-[10px] font-bold uppercase opacity-60">{isCoyoteMode ? 'Equipo Inter-Grupal' : 'Equipo Local'}</p></div>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            {isCoyoteMode && (<Button size="sm" onClick={() => setMigrateModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex-1 sm:flex-none"><Icon name="copy" className="w-4 h-4"/> Importar Base</Button>)}
                                            <button onClick={() => setTeamToConvert({name: selectedTeam, isCoyote: isCoyoteMode})} className="p-2 bg-white border border-border-color rounded-xl hover:bg-slate-50 transition-colors shadow-sm" title={`Convertir a ${isCoyoteMode ? 'Equipo Local (Base)' : 'Equipo Inter-Grupal (Coyote)'}`}><Icon name="file-spreadsheet" className="w-4 h-4 text-primary"/></button>
                                            <button onClick={() => { setNameModalTitle(`Renombrar "${selectedTeam}"`); setNameInputValue(selectedTeam); setNameModalAction('rename'); setNameModalOpen(true); }} className="p-2 bg-white border border-border-color rounded-xl hover:bg-slate-50 transition-colors shadow-sm" title="Renombrar"><Icon name="edit-3" className="w-4 h-4"/></button>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1 block">Notas y Observaciones</label>
                                        <textarea value={currentNote} onChange={(e) => handleNoteChange(e.target.value)} placeholder="Notas sobre el desempeño del equipo..." className="w-full p-3 text-sm border-2 border-border-color rounded-xl bg-surface focus:ring-2 focus:ring-primary focus:border-primary min-h-[80px] shadow-inner transition-all"/>
                                    </div>

                                    <div className="mb-4">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Icon name="search" className="h-4 w-4"/></div>
                                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={`Buscar alumnos...`} className="w-full pl-10 pr-4 py-2.5 border-2 border-border-color rounded-xl bg-surface focus:ring-2 focus:ring-primary text-sm shadow-sm transition-all"/>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar border-2 border-border-color rounded-2xl bg-surface shadow-inner">
                                        <table className="w-full text-left text-sm border-separate border-spacing-0">
                                            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10"><tr className="text-text-secondary uppercase tracking-widest text-[9px] font-black"><th className="p-4 w-16 border-b border-border-color text-center">Incl.</th><th className="p-4 border-b border-border-color">Nombre</th><th className="p-4 border-b border-border-color">Grupo</th><th className="p-4 border-b border-border-color text-center">Estado</th></tr></thead>
                                            <tbody className="divide-y divide-border-color/50">
                                                {filteredStudents.map(({student, gName}) => {
                                                    const isInThisTeam = (isCoyoteMode ? student?.teamCoyote : student?.team) === selectedTeam;
                                                    const otherTeamName = (isCoyoteMode ? student?.teamCoyote : student?.team);
                                                    const hasOtherTeam = otherTeamName && !isInThisTeam;
                                                    return (
                                                        <tr key={`${student?.id}-${gName}`} className={`transition-all ${isInThisTeam ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                                                            <td className="p-4 text-center"><input type="checkbox" checked={isInThisTeam} onChange={(e) => handleAssign(student.id, e.target.checked)} className={`h-5 w-5 rounded border-2 border-slate-300 focus:ring-primary cursor-pointer transition-all ${isCoyoteMode ? 'text-orange-600' : 'text-indigo-600'}`}/></td>
                                                            <td className="p-4"><p className={`font-bold ${isInThisTeam ? 'text-primary' : 'text-text-primary'}`}>{student?.name}</p><p className="text-[9px] font-bold opacity-40 uppercase">{student?.matricula || '-'}</p></td>
                                                            <td className="p-4"><span className={`px-2 py-1 rounded font-black text-[9px] tracking-tighter ${gName === group.name ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>{gName}</span></td>
                                                            <td className="p-4 text-center">{isInThisTeam ? <span className="text-[9px] font-black uppercase text-accent-green-dark bg-accent-green-light px-2 py-0.5 rounded border border-accent-green-dark/20">Miembro</span> : hasOtherTeam ? <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{otherTeamName}</span> : <span className="text-[9px] text-slate-300 italic">Libre</span>}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* MODALES AUXILIARES */}
                <Modal isOpen={isMigrateModalOpen} onClose={() => setMigrateModalOpen(false)} title={`Importar equipo base a Coyote`} size="md">
                    <div className="space-y-4">
                        <p className="text-xs text-indigo-800 font-medium bg-indigo-50 p-3 rounded-xl border border-indigo-100">Esto moverá a todos los alumnos de un equipo local al equipo Coyote seleccionado.</p>
                        <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {allBaseTeamsForQuarter.map(([tName, members]) => (
                                <button key={tName} onClick={() => handleMigrateTeam(tName, members)} className="w-full p-4 bg-surface border-2 border-border-color rounded-xl flex items-center justify-between hover:bg-indigo-50 hover:border-indigo-300 transition-all group">
                                    <div className="text-left"><p className="font-extrabold text-sm group-hover:text-indigo-900">{tName}</p><p className="text-[10px] font-bold opacity-60 uppercase">{members.length} Alumnos</p></div>
                                    <Icon name="arrow-right" className="w-4 h-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-all" />
                                </button>
                            ))}
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={isNameModalOpen} onClose={() => setNameModalOpen(false)} title={nameModalTitle} size="sm">
                    <form onSubmit={handleNameModalSubmit} className="space-y-4">
                        <input type="text" autoFocus value={nameInputValue} onChange={e => setNameInputValue(e.target.value)} className="w-full p-2 border-2 border-border-color rounded-xl focus:ring-2 focus:ring-primary outline-none" placeholder="Nombre del Equipo"/>
                        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={() => setNameModalOpen(false)}>Cancelar</Button><Button type="submit">Aceptar</Button></div>
                    </form>
                </Modal>

                <ConfirmationModal isOpen={!!teamToDelete} onClose={() => setTeamToDelete(null)} onConfirm={executeDeleteTeam} title="Disolver Equipo" variant="danger" confirmText="Disolver">
                    ¿Estás seguro de disolver el equipo <strong>"{teamToDelete?.name}"</strong>? Los alumnos quedarán libres.
                </ConfirmationModal>

                <ConfirmationModal isOpen={!!teamToConvert} onClose={() => setTeamToConvert(null)} onConfirm={executeConvertTeam} title="Cambiar Tipo de Equipo" confirmText="Convertir">
                    ¿Deseas convertir <strong>"{teamToConvert?.name}"</strong> a un equipo <strong>{!teamToConvert?.isCoyote ? 'Coyote (Inter-Grupal)' : 'Base (Local)'}</strong>? 
                    <p className="mt-2 text-xs opacity-70">Las notas y alumnos se conservarán siempre que pertenezcan al grupo actual.</p>
                </ConfirmationModal>

                <Modal isOpen={isRandomModalOpen} onClose={() => setRandomModalOpen(false)} title="Generador Aleatorio de Equipos" size="sm">
                    <div className="space-y-4">
                        <p className="text-xs text-text-secondary">Se crearán equipos automáticamente con los alumnos que aún no tienen asignación.</p>
                        <div>
                            <label className="block text-xs font-black uppercase text-text-secondary mb-1">Integrantes por equipo</label>
                            <input type="number" min="2" max="10" value={randomSize} onChange={e => setRandomSize(parseInt(e.target.value))} className="w-full p-2 border-2 border-border-color rounded-xl"/>
                        </div>
                        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setRandomModalOpen(false)}>Cancelar</Button><Button onClick={executeRandomTeams}>Generar</Button></div>
                    </div>
                </Modal>
            </Modal>
        </>
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

    const selectedGroup = useMemo(() => groups.find(g => g && g.id === selectedGroupId), [groups, selectedGroupId]);
    
    const filteredStudents = useMemo(() => { 
        if (!selectedGroup) return []; 
        if (!searchTerm.trim()) return (selectedGroup.students || []).filter(Boolean); 
        const search = searchTerm.toLowerCase(); 
        return (selectedGroup.students || []).filter(Boolean).filter(s => 
            s?.name?.toLowerCase().includes(search) || 
            (s?.matricula && s?.matricula?.toLowerCase().includes(search)) || 
            (s?.team && s?.team?.toLowerCase().includes(search))
        ); 
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
                students: (confirmDuplicate.students || []).filter(Boolean).map(s => ({ ...s, id: uuidv4() })) 
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
            const sg = groups.find(g => g && g.id === confirmImportCriteria.sourceId);
            if (sg) {
                const updatedGroup = {
                    ...editingGroup,
                    evaluationTypes: {
                        partial1: (sg.evaluationTypes.partial1 || []).map(t => ({...t, id: uuidv4()})),
                        partial2: (sg.evaluationTypes.partial2 || []).map(t => ({...t, id: uuidv4()}))
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 bg-surface p-5 rounded-2xl shadow-sm border border-border-color flex flex-col overflow-hidden max-h-[400px] lg:max-h-full">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-black uppercase tracking-tighter">Mis Grupos</h2>
                        <Button size="sm" onClick={() => { setEditingGroup(undefined); setGroupModalOpen(true); }} className="!p-1.5"><Icon name="plus" className="w-4 h-4"/></Button>
                    </div>
                    <ul className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                       {groups.filter(Boolean).map(group => {
                            const isSelected = selectedGroupId === group.id;
                            return (
                            <li key={group.id} onClick={() => dispatch({ type: 'SET_SELECTED_GROUP', payload: group.id })} className={`group/item p-4 rounded-xl cursor-pointer transition-all border-l-4 ${isSelected ? 'bg-primary text-white border-transparent shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-surface-secondary/50 hover:bg-surface-secondary border-transparent'}`}>
                               <div className="flex justify-between items-center gap-3">
                                   <div className="min-w-0 flex-1">
                                       <p className="font-black text-sm truncate leading-tight">{group.name}</p>
                                       <p className={`text-[10px] font-bold truncate mt-0.5 uppercase tracking-wide ${isSelected ? 'opacity-80' : 'text-text-secondary opacity-60'}`}>{group.subject}</p>
                                   </div>
                                   <div className={`flex gap-1 shrink-0 ${isSelected ? 'text-white' : 'text-text-secondary'}`}>
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmDuplicate(group); }} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="Duplicar"><Icon name="copy" className="w-4 h-4"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); setEditingGroup(group); setGroupModalOpen(true); }} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="Editar"><Icon name="edit-3" className="w-4 h-4"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteGroup({id: group.id, name: group.name}); }} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-accent-red rounded-lg transition-colors" title="Borrar"><Icon name="trash-2" className="w-4 h-4"/></button>
                                   </div>
                               </div>
                           </li>
                           );
                        })}
                        {groups.length === 0 && (
                            <div className="text-center py-10 opacity-30">
                                <Icon name="users" className="w-10 h-10 mx-auto mb-2"/>
                                <p className="text-xs font-bold uppercase">Sin grupos</p>
                            </div>
                        )}
                    </ul>
                </div>

                <div className="lg:col-span-8 bg-surface p-5 rounded-2xl shadow-sm border border-border-color flex flex-col overflow-hidden min-h-[400px]">
                   {selectedGroup ? (
                        <div className="flex flex-col h-full overflow-hidden">
                            <div className="mb-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-3 h-8 rounded-full ${GROUP_COLORS.find(c => c.name === selectedGroup.color)?.bg || 'bg-primary'}`}></div>
                                        <h2 className="text-2xl font-black truncate tracking-tighter">{selectedGroup.name}</h2>
                                    </div>
                                    <div className="flex gap-2">
                                        <TeamsManager group={selectedGroup} />
                                        <Button size="sm" variant="secondary" onClick={() => setBulkModalOpen(true)} className="!p-1.5" title="Importar Lista"><Icon name="list-plus" className="w-5 h-5"/></Button>
                                        <Button size="sm" onClick={() => { setEditingStudent(undefined); setStudentModalOpen(true); }} className="!p-1.5" title="Agregar Alumno"><Icon name="user-plus" className="w-5 h-5"/></Button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Icon name="search" className="h-4 w-4"/>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={searchTerm} 
                                        onChange={e => setSearchTerm(e.target.value)} 
                                        placeholder="Filtrar alumnos por nombre o matrícula..." 
                                        className="w-full pl-10 pr-4 py-2 border-2 border-border-color rounded-xl bg-surface text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    />
                                </div>
                            </div>
                            <div className="overflow-auto flex-1 custom-scrollbar border border-border-color rounded-xl">
                                <table className="w-full text-left text-xs border-separate border-spacing-0">
                                    <thead className="sticky top-0 bg-slate-50 z-10">
                                        <tr className="border-b border-border-color text-text-secondary uppercase tracking-widest text-[9px] font-black">
                                            <th className="p-3 w-10 text-center border-b border-border-color">#</th>
                                            {settings.showMatricula && <th className="p-3 border-b border-border-color">Matrícula</th>}
                                            <th className="p-3 border-b border-border-color">Nombre</th>
                                            <th className="p-3 border-b border-border-color text-center">Equipos</th>
                                            <th className="p-3 border-b border-border-color text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-color/40">
                                        {filteredStudents.map((s, i) => (
                                            <tr key={s.id} className="hover:bg-surface-secondary/40 transition-colors">
                                                <td className="p-3 text-text-secondary font-black text-center">{i + 1}</td>
                                                {settings.showMatricula && <td className="p-3 font-bold opacity-60 uppercase">{s.matricula || '-'}</td>}
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-text-primary">{s.name}</span>
                                                        {s.isRepeating && <span className="bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">R</span>}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex flex-col gap-1 items-center">
                                                        {s.team && <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-black uppercase border border-indigo-200">Base: {s.team}</span>}
                                                        {s.teamCoyote && (
                                                            <span className="text-[9px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-black uppercase border border-orange-200 flex items-center gap-1">
                                                                <Icon name="dog" className="w-2.5 h-2.5"/> {s.teamCoyote}
                                                            </span>
                                                        )}
                                                        {!s.team && !s.teamCoyote && <span className="text-slate-300 italic">Libre</span>}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button onClick={() => { setEditingStudent(s); setStudentModalOpen(true); }} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"><Icon name="edit-3" className="w-4 h-4"/></button>
                                                        <button onClick={() => { setConfirmDeleteStudent({id: s.id, name: s.name}); }} className="p-1.5 text-accent-red hover:bg-rose-50 rounded-lg transition-all"><Icon name="trash-2" className="w-4 h-4"/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                   ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-30">
                            <Icon name="users" className="w-20 h-20 mb-4"/>
                            <p className="text-lg font-black uppercase tracking-tighter">Selecciona un grupo</p>
                            <p className="text-sm">Usa el panel de la izquierda para ver alumnos y equipos.</p>
                        </div>
                   )}
                </div>
            </div>

            <Modal isOpen={isGroupModalOpen} onClose={() => setGroupModalOpen(false)} title={editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'} size="xl">
                <GroupForm 
                    group={editingGroup} 
                    existingGroups={groups} 
                    onSave={handleSaveGroup} 
                    onCancel={() => setGroupModalOpen(false)} 
                    onImportCriteria={(sourceId) => setConfirmImportCriteria({sourceId, groupName: groups.find(g => g && g.id === sourceId)?.name || ''})}
                />
            </Modal>
            <Modal isOpen={isStudentModalOpen} onClose={() => setStudentModalOpen(false)} title={editingStudent ? 'Editar Alumno' : 'Nuevo Alumno'}><StudentForm student={editingStudent} currentGroup={selectedGroup} allGroups={groups} onSave={handleSaveStudent} onCancel={() => setStudentModalOpen(false)} /></Modal>
            <Modal isOpen={isBulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Importar Varios Alumnos" size="lg">
                <BulkStudentForm 
                    onSave={(students) => {
                        if (selectedGroupId) {
                            dispatch({ type: 'BULK_ADD_STUDENTS', payload: { groupId: selectedGroupId, students } });
                            setBulkModalOpen(false);
                            dispatch({ type: 'ADD_TOAST', payload: { message: `${students.length} alumnos agregados con éxito.`, type: 'success' } });
                        }
                    }} 
                    onCancel={() => setBulkModalOpen(false)} 
                />
            </Modal>

            {/* --- All Confirmation Modals --- */}
            <ConfirmationModal
                isOpen={!!confirmDeleteGroup}
                onClose={() => setConfirmDeleteGroup(null)}
                onConfirm={deleteGroupAction}
                title="Eliminar Grupo"
                variant="danger"
                confirmText="Eliminar permanentemente"
            >
                ¿Estás seguro de que quieres eliminar <strong>"{confirmDeleteGroup?.name}"</strong>? 
                <p className="mt-2 text-xs font-bold text-accent-red uppercase tracking-widest">¡Esta acción borrará todas las asistencias y calificaciones!</p>
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
                confirmText="Crear Copia"
            >
                ¿Deseas crear una copia del grupo <strong>"{confirmDuplicate?.name}"</strong>? 
                <p className="mt-2 text-xs opacity-70">Se copiará la lista de alumnos y la configuración de evaluación.</p>
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={!!confirmImportCriteria}
                onClose={() => setConfirmImportCriteria(null)}
                onConfirm={importCriteriaAction}
                title="Importar Criterios"
                confirmText="Importar"
            >
                ¿Importar criterios de <strong>"{confirmImportCriteria?.groupName}"</strong>?
                <p className="mt-2 text-xs opacity-70">Esto reemplazará los pesos (%) del formulario actual.</p>
            </ConfirmationModal>
        </div>
    );
};

export default GroupManagement;
