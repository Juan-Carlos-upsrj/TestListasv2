
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Student } from '../types';
import Icon from './icons/Icon';
import Button from './common/Button';
import Modal from './common/Modal';
import ConfirmationModal from './common/ConfirmationModal';
import { motion, AnimatePresence } from 'framer-motion';
import { calculatePartialAverage } from '../services/gradeCalculation';

const INDIVIDUAL_WORK = "TRABAJO INDIVIDUAL";

const TeamsView: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, selectedGroupId, teamNotes = {}, coyoteTeamNotes = {}, grades, evaluations, settings, attendance } = state;
    
    const [teamType, setTeamType] = useState<'base' | 'coyote'>('coyote');
    const [editingTeam, setEditingTeam] = useState<{ name: string; isCoyote: boolean } | null>(null);
    const [teamNote, setTeamNote] = useState('');
    const [newTeamName, setNewTeamName] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ name: string; isCoyote: boolean } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para gestión de integrantes en edición
    const [editSearch, setEditSearch] = useState('');

    // Estados para el nuevo modal de creación
    const [createForm, setCreateForm] = useState({ name: '', note: '', isCoyote: true });
    const [createSearch, setCreateSearch] = useState('');
    const [selectedStudentsForNewTeam, setSelectedStudentsForNewTeam] = useState<string[]>([]);

    const group = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);

    useEffect(() => {
        if (!selectedGroupId && groups.length > 0) {
            dispatch({ type: 'SET_SELECTED_GROUP', payload: groups[0].id });
        }
    }, [groups, selectedGroupId, dispatch]);

    const { teams, unassigned } = useMemo(() => {
        if (!group) return { teams: [], unassigned: [] };
        const isCoyote = teamType === 'coyote';
        const teamMap = new Map<string, { student: Student; groupName: string }[]>();
        const unassignedList: { student: Student; groupName: string }[] = [];
        
        const processedStudentNames = new Set<string>();

        const processStudent = (s: Student, gName: string) => {
            if (isCoyote) {
                if (processedStudentNames.has(s.name)) return;
                processedStudentNames.add(s.name);
            }

            const tName = isCoyote ? s.teamCoyote : s.team;
            if (tName) {
                if (!teamMap.has(tName)) teamMap.set(tName, []);
                teamMap.get(tName)!.push({ student: s, groupName: gName });
            } else {
                unassignedList.push({ student: s, groupName: gName });
            }
        };

        if (isCoyote) {
            const targetQuarter = group.quarter;
            const groupsInSameQuarter = groups.filter(g => g.quarter === targetQuarter);
            group.students.forEach(s => processStudent(s, group.name));
            groupsInSameQuarter.forEach(g => {
                if (g.id !== group.id) {
                    g.students.forEach(s => processStudent(s, g.name));
                }
            });
        } else {
            group.students.forEach(s => processStudent(s, group.name));
        }

        let teamsList = Array.from(teamMap.entries()).map(([name, members]) => ({
            name,
            members,
            note: (isCoyote ? coyoteTeamNotes[name] : teamNotes[name]) || ''
        }));

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            teamsList = teamsList.filter(t => 
                t.name.toLowerCase().includes(term) ||
                t.members.some(m => 
                    m.student.name.toLowerCase().includes(term) || 
                    (m.student.nickname && m.student.nickname.toLowerCase().includes(term))
                )
            );
        }

        return { 
            teams: teamsList.sort((a, b) => a.name.localeCompare(b.name)),
            unassigned: unassignedList
        };
    }, [group, teamType, teamNotes, coyoteTeamNotes, groups, searchTerm]);

    // Lógica para el buscador de creación
    const availableStudentsForCreation = useMemo(() => {
        if (!group) return [];
        let pool: { student: Student; groupName: string }[] = [];
        const isCoyote = createForm.isCoyote;

        if (isCoyote) {
            const groupsInSameQuarter = groups.filter(g => g.quarter === group.quarter);
            const seen = new Set<string>();
            groupsInSameQuarter.forEach(g => {
                g.students.forEach(s => {
                    if (!seen.has(s.name)) {
                        pool.push({ student: s, groupName: g.name });
                        seen.add(s.name);
                    }
                });
            });
        } else {
            group.students.forEach(s => pool.push({ student: s, groupName: group.name }));
        }

        if (!createSearch.trim()) return pool;
        const term = createSearch.toLowerCase();
        return pool.filter(p => p.student.name.toLowerCase().includes(term) || (p.student.nickname && p.student.nickname.toLowerCase().includes(term)));
    }, [group, groups, createForm.isCoyote, createSearch]);

    // Lógica para buscador en edición (alumnos disponibles para este equipo)
    const availableStudentsForEdit = useMemo(() => {
        if (!group || !editingTeam) return [];
        let pool: { student: Student; groupName: string }[] = [];
        const isCoyote = editingTeam.isCoyote;

        if (isCoyote) {
            const targetQuarter = group.quarter;
            const groupsInSameQuarter = groups.filter(g => g.quarter === targetQuarter);
            const seen = new Set<string>();
            groupsInSameQuarter.forEach(g => {
                g.students.forEach(s => {
                    if (!seen.has(s.name) && s.teamCoyote !== editingTeam.name) {
                        pool.push({ student: s, groupName: g.name });
                        seen.add(s.name);
                    }
                });
            });
        } else {
            group.students.forEach(s => {
                if (s.team !== editingTeam.name) {
                    pool.push({ student: s, groupName: group.name });
                }
            });
        }

        if (!editSearch.trim()) return pool;
        const term = editSearch.toLowerCase();
        return pool.filter(p => p.student.name.toLowerCase().includes(term) || (p.student.nickname && p.student.nickname.toLowerCase().includes(term)));
    }, [group, groups, editingTeam, editSearch]);

    const handleOpenCreate = () => {
        setCreateForm({ name: '', note: '', isCoyote: teamType === 'coyote' });
        setSelectedStudentsForNewTeam([]);
        setCreateSearch('');
        setIsCreateModalOpen(true);
    };

    const handleSaveCreate = () => {
        if (!createForm.name.trim()) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'El equipo debe tener un nombre.', type: 'error' } });
            return;
        }
        if (selectedStudentsForNewTeam.length === 0) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Selecciona al menos un alumno.', type: 'error' } });
            return;
        }

        const tName = createForm.name.trim();
        const isC = createForm.isCoyote;

        // 1. Guardar nota
        dispatch({ type: 'UPDATE_TEAM_NOTE', payload: { teamName: tName, note: createForm.note, isCoyote: isC } });
        
        // 2. Asignar alumnos
        selectedStudentsForNewTeam.forEach(sid => {
            dispatch({ type: 'ASSIGN_STUDENT_TEAM', payload: { studentId: sid, teamName: tName, isCoyote: isC } });
        });

        setIsCreateModalOpen(false);
        dispatch({ type: 'ADD_TOAST', payload: { message: `Equipo "${tName}" creado con éxito.`, type: 'success' } });
    };

    const toggleStudentInNewTeam = (studentId: string) => {
        const isSelected = selectedStudentsForNewTeam.includes(studentId);
        if (!isSelected && createForm.isCoyote && selectedStudentsForNewTeam.length >= 4) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Los equipos Coyote están limitados a 4 alumnos.', type: 'error' } });
            return;
        }
        setSelectedStudentsForNewTeam(prev => isSelected ? prev.filter(id => id !== studentId) : [...prev, studentId]);
    };

    const handleOpenEdit = (name: string, note: string) => {
        const isCoyote = teamType === 'coyote';
        setEditingTeam({ name, isCoyote });
        setNewTeamName(name);
        setTeamNote(note);
        setEditSearch('');
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = () => {
        if (!editingTeam) return;
        dispatch({ type: 'UPDATE_TEAM_NOTE', payload: { teamName: editingTeam.name, note: teamNote, isCoyote: editingTeam.isCoyote } });
        if (newTeamName.trim() && newTeamName !== editingTeam.name) {
            dispatch({ type: 'RENAME_TEAM', payload: { oldName: editingTeam.name, newName: newTeamName.trim(), isCoyote: editingTeam.isCoyote } });
        }
        setIsEditModalOpen(false);
        setEditingTeam(null);
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Equipo actualizado.', type: 'success' } });
    };

    const handleRemoveMember = (studentId: string) => {
        if (!editingTeam) return;
        dispatch({ type: 'ASSIGN_STUDENT_TEAM', payload: { studentId, teamName: undefined, isCoyote: editingTeam.isCoyote } });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Integrante removido.', type: 'info' } });
    };

    const handleAddMember = (studentId: string) => {
        if (!editingTeam) return;
        
        // Validar límite Coyote
        if (editingTeam.isCoyote) {
            const currentCount = teams.find(t => t.name === editingTeam.name)?.members.length || 0;
            if (currentCount >= 4) {
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Los equipos Coyote no pueden exceder 4 alumnos.', type: 'error' } });
                return;
            }
        }

        dispatch({ type: 'ASSIGN_STUDENT_TEAM', payload: { studentId, teamName: editingTeam.name, isCoyote: editingTeam.isCoyote } });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Integrante añadido.', type: 'success' } });
    };

    const handleDeleteTeam = () => {
        if (confirmDelete) {
            dispatch({ type: 'DELETE_TEAM', payload: { teamName: confirmDelete.name, isCoyote: confirmDelete.isCoyote } });
            setConfirmDelete(null);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Equipo disuelto.', type: 'info' } });
        }
    };

    const markAsIndividual = (studentId: string) => {
        dispatch({ type: 'ASSIGN_STUDENT_TEAM', payload: { studentId, teamName: INDIVIDUAL_WORK, isCoyote: teamType === 'coyote' } });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Alumno marcado para Trabajo Individual.', type: 'success' } });
    };

    const generateTeams = () => {
        if (!selectedGroupId) {
             dispatch({ type: 'ADD_TOAST', payload: { message: 'Selecciona un grupo para generar equipos.', type: 'error' } });
             return;
        }
        const sizeInput = prompt("Tamaño máximo por equipo:", "5");
        if (sizeInput === null) return;
        const size = parseInt(sizeInput || "0");
        if (size > 0) {
            dispatch({ type: 'GENERATE_RANDOM_TEAMS', payload: { groupId: selectedGroupId, maxTeamSize: size } });
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Equipos generados aleatoriamente.', type: 'success' } });
        }
    };

    // Cálculo de estadísticas para el equipo en edición
    const teamStats = useMemo(() => {
        if (!editingTeam || !group) return null;
        const currentTeamData = teams.find(t => t.name === editingTeam.name);
        if (!currentTeamData) return null;

        const members = currentTeamData.members;
        if (members.length === 0) return null;

        let p1Sum = 0, p1Count = 0;
        let p2Sum = 0, p2Count = 0;

        members.forEach(m => {
            const sid = m.student.id;
            const gid = group.id; // Asumimos grupo actual para simplificar
            const studentGrades = grades[gid]?.[sid] || {};
            const groupEvals = evaluations[gid] || [];
            const studentAtt = attendance[gid]?.[sid] || {};

            const p1 = calculatePartialAverage(group, 1, groupEvals, studentGrades, settings, studentAtt);
            const p2 = calculatePartialAverage(group, 2, groupEvals, studentGrades, settings, studentAtt);

            if (p1 !== null) { p1Sum += p1; p1Count++; }
            if (p2 !== null) { p2Sum += p2; p2Count++; }
        });

        const p1Avg = p1Count > 0 ? p1Sum / p1Count : null;
        const p2Avg = p2Count > 0 ? p2Sum / p2Count : null;
        const finalAvg = (p1Avg !== null && p2Avg !== null) ? (p1Avg + p2Avg) / 2 : (p1Avg || p2Avg || null);

        return { p1: p1Avg, p2: p2Avg, final: finalAvg };
    }, [editingTeam, teams, group, grades, evaluations, settings, attendance]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="bg-surface p-4 mb-6 rounded-2xl border border-border-color shadow-sm space-y-4 shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <select 
                            value={selectedGroupId || ''} 
                            onChange={(e) => dispatch({ type: 'SET_SELECTED_GROUP', payload: e.target.value })}
                            className="p-2 border-2 border-border-color rounded-xl bg-white text-sm font-bold focus:ring-2 focus:ring-primary min-w-[200px]"
                        >
                            <option value="" disabled>Selecciona un grupo</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        
                        <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200">
                            <button 
                                onClick={() => setTeamType('base')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${teamType === 'base' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                EQUIPO BASE
                            </button>
                            <button 
                                onClick={() => setTeamType('coyote')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${teamType === 'coyote' ? 'bg-white shadow text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                EQUIPO COYOTE
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto items-center">
                        <div className="relative flex-1 md:w-48 lg:w-64">
                            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input 
                                type="text" 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar equipo o alumno..."
                                className="w-full pl-9 pr-3 py-2 border-2 border-border-color rounded-xl bg-white text-xs focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <Button variant="secondary" size="sm" onClick={generateTeams} className="shrink-0" title="Generación Aleatoria">
                            <Icon name="grid" className="w-4 h-4" /> Aleatorio
                        </Button>
                        <Button size="sm" onClick={handleOpenCreate} className="shrink-0">
                            <Icon name="plus" className="w-4 h-4" /> Nuevo Equipo
                        </Button>
                    </div>
                </div>
                
                {teamType === 'coyote' && group && (
                    <div className="bg-orange-50 border border-orange-100 p-2 rounded-xl flex items-center gap-2">
                        <Icon name="info" className="w-4 h-4 text-orange-500 shrink-0" />
                        <p className="text-[10px] font-bold text-orange-700 uppercase">
                            Limpieza Automática Activada: Los alumnos con el mismo nombre en diferentes grupos solo se muestran una vez.
                        </p>
                    </div>
                )}
            </div>

            {group ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                    {/* SECCIÓN SIN ASIGNAR */}
                    {unassigned.length > 0 && !searchTerm && (
                        <div className="mb-8 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                                    <Icon name="users" className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">Pendientes de Asignación / Trabajo Individual</h4>
                                    <p className="text-[10px] text-slate-400 font-bold">Estos alumnos no pertenecen a ningún equipo.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {unassigned.map(item => (
                                    <div key={item.student.id} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-slate-700 truncate">{item.student.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">[{item.groupName}] {item.student.nickname && `• "${item.student.nickname}"`}</p>
                                        </div>
                                        <button 
                                            onClick={() => markAsIndividual(item.student.id)}
                                            className="shrink-0 p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            title="Marcar como Trabajo Individual"
                                        >
                                            <Icon name="user-plus" className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {teams.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            <AnimatePresence>
                                {teams.map((team) => (
                                    <motion.div 
                                        layout
                                        key={team.name}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-surface rounded-2xl border-2 border-border-color shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden h-full"
                                    >
                                        <div className={`p-4 border-b border-border-color flex justify-between items-center ${team.name === INDIVIDUAL_WORK ? 'bg-slate-100' : (teamType === 'coyote' ? 'bg-orange-50' : 'bg-indigo-50')}`}>
                                            <div className="min-w-0">
                                                <h4 className={`font-black text-sm truncate uppercase tracking-tight ${team.name === INDIVIDUAL_WORK ? 'text-slate-600' : (teamType === 'coyote' ? 'text-orange-700' : 'text-indigo-700')}`}>{team.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{team.members.length} INTEGRANTES</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleOpenEdit(team.name, team.note)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-primary hover:border-primary transition-all shadow-sm"><Icon name="edit-3" className="w-4 h-4"/></button>
                                                {team.name !== INDIVIDUAL_WORK && (
                                                    <button onClick={() => setConfirmDelete({ name: team.name, isCoyote: teamType === 'coyote' })} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"><Icon name="trash-2" className="w-4 h-4"/></button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-4 flex-1 flex flex-col space-y-4">
                                            <div className="space-y-1">
                                                <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Integrantes</h5>
                                                <div className="flex flex-col gap-1">
                                                    {team.members.map(m => (
                                                        <div key={m.student.id} className="text-xs font-bold text-slate-700 bg-white border border-slate-100 px-2 py-1 rounded-lg flex flex-col">
                                                            <div className="flex justify-between items-center gap-2">
                                                                <span className="truncate">{m.student.name}</span>
                                                                <span className="shrink-0 text-[8px] font-black bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">{m.groupName}</span>
                                                            </div>
                                                            {m.student.nickname && <span className="text-[9px] text-primary italic font-bold leading-none mt-0.5">"{m.student.nickname}"</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-slate-100 flex-1">
                                                <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Notas del Equipo</h5>
                                                <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100 min-h-[60px]">
                                                    {team.note || 'Sin observaciones.'}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                            <Icon name="users" className="w-20 h-20 mb-4" />
                            <p className="font-black uppercase tracking-widest text-sm">
                                {searchTerm ? 'No hay coincidencias para la búsqueda.' : `No hay equipos ${teamType === 'coyote' ? 'Coyote' : 'Base'} asignados.`}
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                    <Icon name="grid" className="w-20 h-20 mb-4" />
                    <p className="font-black uppercase tracking-widest text-sm">Selecciona un grupo para gestionar sus equipos</p>
                </div>
            )}

            {/* MODAL DE CREACIÓN (DOBLE COLUMNA) */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Crear Nuevo Equipo" size="5xl">
                <div className="flex flex-col lg:flex-row h-[70vh] -m-6 bg-slate-50 overflow-hidden">
                    {/* COLUMNA IZQUIERDA: CONFIG */}
                    <div className="lg:w-2/5 p-6 border-r border-slate-200 bg-white flex flex-col">
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Información del Equipo</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Nombre del Equipo</label>
                                        <input 
                                            type="text" 
                                            value={createForm.name} 
                                            onChange={e => setCreateForm({...createForm, name: e.target.value})}
                                            placeholder="Ej. Selección Coyote"
                                            className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary transition-all font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Tipo de Asignación</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button 
                                                onClick={() => setCreateForm({...createForm, isCoyote: false})}
                                                className={`p-2 rounded-xl text-xs font-bold border-2 transition-all ${!createForm.isCoyote ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400'}`}
                                            >
                                                Equipo Base
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setCreateForm({...createForm, isCoyote: true});
                                                    if (selectedStudentsForNewTeam.length > 4) {
                                                        setSelectedStudentsForNewTeam(selectedStudentsForNewTeam.slice(0, 4));
                                                    }
                                                }}
                                                className={`p-2 rounded-xl text-xs font-bold border-2 transition-all ${createForm.isCoyote ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400'}`}
                                            >
                                                Equipo Coyote
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Observaciones</label>
                                        <textarea 
                                            value={createForm.note} 
                                            onChange={e => setCreateForm({...createForm, note: e.target.value})}
                                            rows={5}
                                            placeholder="Notas internas del equipo..."
                                            className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary transition-all text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-auto pt-6 border-t border-slate-100">
                             <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${createForm.isCoyote && selectedStudentsForNewTeam.length >= 4 ? 'bg-orange-50 border-orange-200' : 'bg-indigo-50 border-indigo-100'}`}>
                                <div className={`${createForm.isCoyote && selectedStudentsForNewTeam.length >= 4 ? 'bg-orange-600' : 'bg-indigo-600'} text-white p-2 rounded-lg`}>
                                    <Icon name="users" className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className={`text-[10px] font-black uppercase leading-none ${createForm.isCoyote && selectedStudentsForNewTeam.length >= 4 ? 'text-orange-400' : 'text-indigo-400'}`}>Seleccionados</p>
                                    <p className={`text-sm font-black ${createForm.isCoyote && selectedStudentsForNewTeam.length >= 4 ? 'text-orange-700' : 'text-indigo-700'}`}>{selectedStudentsForNewTeam.length} / {createForm.isCoyote ? '4' : '∞'} Alumnos</p>
                                </div>
                             </div>
                             {createForm.isCoyote && (
                                 <p className="text-[9px] text-orange-600 font-bold mt-2 italic px-1">Límite de 4 alumnos para equipos Coyote.</p>
                             )}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: SELECCIÓN */}
                    <div className="flex-1 p-6 flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Asignar Integrantes</h4>
                            <div className="relative w-64">
                                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={createSearch} 
                                    onChange={e => setCreateSearch(e.target.value)}
                                    placeholder="Buscar alumno..."
                                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl bg-white text-xs focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                            {availableStudentsForCreation.length > 0 ? (
                                availableStudentsForCreation.map(p => {
                                    const isSelected = selectedStudentsForNewTeam.includes(p.student.id);
                                    const currentTeam = createForm.isCoyote ? p.student.teamCoyote : p.student.team;
                                    const isDisabled = !isSelected && createForm.isCoyote && selectedStudentsForNewTeam.length >= 4;

                                    return (
                                        <div 
                                            key={p.student.id} 
                                            onClick={() => !isDisabled && toggleStudentInNewTeam(p.student.id)}
                                            className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-between group ${isSelected ? 'bg-primary/5 border-primary shadow-sm cursor-pointer' : isDisabled ? 'opacity-40 grayscale bg-slate-50 border-slate-100 cursor-not-allowed' : 'bg-white border-slate-100 hover:border-slate-200 cursor-pointer'}`}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-black text-xs uppercase ${isSelected ? 'text-primary' : 'text-slate-700'}`}>{p.student.name}</span>
                                                    {p.student.nickname && <span className="text-[10px] text-primary italic font-bold">"{p.student.nickname}"</span>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">{p.groupName}</span>
                                                    {currentTeam && (
                                                        <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Actualmente en: {currentTeam}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-primary text-white scale-110' : isDisabled ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 text-slate-300 group-hover:text-slate-400 group-hover:bg-slate-200'}`}>
                                                <Icon name={isSelected ? "check-circle-2" : isDisabled ? "x-circle" : "plus"} className="w-5 h-5" />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10 opacity-40">
                                    <Icon name="search" className="w-12 h-12 mx-auto mb-2" />
                                    <p className="text-xs font-bold uppercase">No se encontraron alumnos</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
                    <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveCreate} className="px-8 shadow-lg shadow-primary/20">
                        Crear Equipo <Icon name="check-circle-2" className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </Modal>

            {/* MODAL DE EDICIÓN (MEJORADO CON GESTIÓN DE INTEGRANTES Y CALIFICACIONES) */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Editar Equipo: ${editingTeam?.name}`} size="5xl">
                <div className="flex flex-col lg:flex-row h-[75vh] -m-6 bg-slate-50 overflow-hidden">
                    {/* COLUMNA IZQUIERDA: CONFIG + INTEGRANTES ACTUALES + STATS */}
                    <div className="lg:w-2/5 p-6 border-r border-slate-200 bg-white flex flex-col overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                            {/* Rendimiento del Equipo */}
                            {teamStats && (
                                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase text-indigo-400 mb-3 tracking-widest flex items-center gap-2">
                                        <Icon name="bar-chart-3" className="w-3 h-3" /> Rendimiento Promedio del Equipo
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-white p-2 rounded-xl text-center shadow-sm">
                                            <span className="text-[8px] font-black text-slate-400 uppercase block">Parcial 1</span>
                                            <span className={`text-sm font-black ${teamStats.p1 !== null && teamStats.p1 >= 7 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {teamStats.p1 !== null ? teamStats.p1.toFixed(1) : '-'}
                                            </span>
                                        </div>
                                        <div className="bg-white p-2 rounded-xl text-center shadow-sm">
                                            <span className="text-[8px] font-black text-slate-400 uppercase block">Parcial 2</span>
                                            <span className={`text-sm font-black ${teamStats.p2 !== null && teamStats.p2 >= 7 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {teamStats.p2 !== null ? teamStats.p2.toFixed(1) : '-'}
                                            </span>
                                        </div>
                                        <div className="bg-indigo-600 p-2 rounded-xl text-center shadow-md">
                                            <span className="text-[8px] font-black text-white/70 uppercase block">Global</span>
                                            <span className="text-sm font-black text-white">
                                                {teamStats.final !== null ? teamStats.final.toFixed(1) : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Ajustes del Equipo</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Nombre</label>
                                        <input 
                                            type="text" 
                                            value={newTeamName} 
                                            onChange={e => setNewTeamName(e.target.value)}
                                            disabled={editingTeam?.name === INDIVIDUAL_WORK}
                                            className="w-full p-2 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary font-bold transition-all disabled:opacity-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Notas de Seguimiento</label>
                                        <textarea 
                                            value={teamNote} 
                                            onChange={e => setTeamNote(e.target.value)}
                                            rows={3}
                                            className="w-full p-2 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary text-sm transition-all"
                                            placeholder="Observaciones grupales..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Lista de Integrantes Actuales */}
                            <div className="pt-2">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Integrantes Actuales</h4>
                                <div className="space-y-2">
                                    {teams.find(t => t.name === editingTeam?.name)?.members.map(m => (
                                        <div key={m.student.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 group">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-700 truncate uppercase">{m.student.name}</p>
                                                {m.student.nickname && <p className="text-[9px] text-primary italic font-bold leading-none">"{m.student.nickname}"</p>}
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveMember(m.student.id)}
                                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                title="Remover del equipo"
                                            >
                                                <Icon name="trash-2" className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {(teams.find(t => t.name === editingTeam?.name)?.members.length || 0) === 0 && (
                                        <p className="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">El equipo no tiene integrantes.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: SELECCIÓN PARA AGREGAR */}
                    <div className="flex-1 p-6 flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Agregar Alumnos</h4>
                            <div className="relative w-64">
                                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={editSearch} 
                                    onChange={e => setEditSearch(e.target.value)}
                                    placeholder="Buscar disponible..."
                                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl bg-white text-xs focus:ring-2 focus:ring-primary transition-all"
                                />
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                            {availableStudentsForEdit.length > 0 ? (
                                availableStudentsForEdit.map(p => {
                                    const currentTeam = editingTeam?.isCoyote ? p.student.teamCoyote : p.student.team;
                                    const isCoyote = editingTeam?.isCoyote;
                                    const currentCount = teams.find(t => t.name === editingTeam?.name)?.members.length || 0;
                                    const isDisabled = isCoyote && currentCount >= 4;

                                    return (
                                        <div 
                                            key={p.student.id} 
                                            className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-between group ${isDisabled ? 'opacity-40 grayscale bg-slate-50 border-slate-100 cursor-not-allowed' : 'bg-white border-slate-50 hover:border-slate-100'}`}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-xs uppercase text-slate-700">{p.student.name}</span>
                                                    {p.student.nickname && <span className="text-[10px] text-primary italic font-bold">"{p.student.nickname}"</span>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">{p.groupName}</span>
                                                    {currentTeam && (
                                                        <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">En: {currentTeam}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {!isDisabled && (
                                                <button 
                                                    onClick={() => handleAddMember(p.student.id)}
                                                    className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm group-hover:scale-110"
                                                    title="Añadir al equipo"
                                                >
                                                    <Icon name="plus" className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10 opacity-40">
                                    <Icon name="search" className="w-12 h-12 mx-auto mb-2" />
                                    <p className="text-[10px] font-black uppercase">No se encontraron alumnos disponibles</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
                    <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveEdit} className="px-8 shadow-lg shadow-primary/20">
                        Guardar Cambios <Icon name="check-circle-2" className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </Modal>

            {/* CONFIRMACIÓN ELIMINAR */}
            <ConfirmationModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDeleteTeam}
                title="Disolver Equipo"
                variant="danger"
            >
                ¿Estás seguro de que deseas disolver el equipo <b>{confirmDelete?.name}</b>?
                <p className="text-xs mt-2 text-slate-400 italic">Los alumnos pasarán a la sección de "Sin Asignar".</p>
            </ConfirmationModal>
        </div>
    );
};

export default TeamsView;
