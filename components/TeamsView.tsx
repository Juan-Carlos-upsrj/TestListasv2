
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Student } from '../types';
import Icon from './icons/Icon';
import Button from './common/Button';
import Modal from './common/Modal';
import ConfirmationModal from './common/ConfirmationModal';
import { motion, AnimatePresence } from 'framer-motion';

const INDIVIDUAL_WORK = "TRABAJO INDIVIDUAL";

const TeamsView: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, selectedGroupId, teamNotes = {}, coyoteTeamNotes = {} } = state;
    
    const [teamType, setTeamType] = useState<'base' | 'coyote'>('base');
    const [editingTeam, setEditingTeam] = useState<{ name: string; isCoyote: boolean } | null>(null);
    const [teamNote, setTeamNote] = useState('');
    const [newTeamName, setNewTeamName] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ name: string; isCoyote: boolean } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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
        
        const processStudent = (s: Student, gName: string) => {
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
            groupsInSameQuarter.forEach(g => {
                g.students.forEach(s => processStudent(s, g.name));
            });
        } else {
            group.students.forEach(s => processStudent(s, group.name));
        }

        let teamsList = Array.from(teamMap.entries()).map(([name, members]) => ({
            name,
            members,
            note: (isCoyote ? coyoteTeamNotes[name] : teamNotes[name]) || ''
        }));

        // Filtro de búsqueda
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

    const handleOpenEdit = (name: string, note: string) => {
        setEditingTeam({ name, isCoyote: teamType === 'coyote' });
        setNewTeamName(name);
        setTeamNote(note);
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
        if (!group) return;
        const size = parseInt(prompt("Tamaño máximo por equipo:", "5") || "0");
        if (size > 0) {
            dispatch({ type: 'GENERATE_RANDOM_TEAMS', payload: { groupId: group.id, maxTeamSize: size } });
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Equipos generados aleatoriamente.', type: 'success' } });
        }
    };

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
                        <div className="relative flex-1 md:w-64">
                            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input 
                                type="text" 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar equipo o alumno..."
                                className="w-full pl-9 pr-3 py-2 border-2 border-border-color rounded-xl bg-white text-xs focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <Button variant="secondary" size="sm" onClick={generateTeams} className="shrink-0">
                            <Icon name="grid" className="w-4 h-4" /> Aleatorio
                        </Button>
                    </div>
                </div>
                
                {teamType === 'coyote' && group && (
                    <div className="bg-orange-50 border border-orange-100 p-2 rounded-xl flex items-center gap-2">
                        <Icon name="info" className="w-4 h-4 text-orange-500 shrink-0" />
                        <p className="text-[10px] font-bold text-orange-700 uppercase">
                            Vista Global Cuatrimestre {group.quarter}: Sincronizando alumnos de todos los grupos {group.quarter}.
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

            {/* MODAL DE EDICIÓN */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Equipo">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black uppercase text-slate-500 mb-1">Nombre del Equipo</label>
                        <input 
                            type="text" 
                            value={newTeamName} 
                            onChange={e => setNewTeamName(e.target.value)}
                            disabled={editingTeam?.name === INDIVIDUAL_WORK}
                            className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-primary font-bold disabled:opacity-50"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase text-slate-500 mb-1">Notas de Seguimiento</label>
                        <textarea 
                            value={teamNote} 
                            onChange={e => setTeamNote(e.target.value)}
                            rows={4}
                            className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-primary text-sm"
                            placeholder="Añade observaciones sobre el desempeño..."
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveEdit}>Guardar Cambios</Button>
                    </div>
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
