
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Student } from '../types';
import Icon from './icons/Icon';
import Button from './common/Button';
import Modal from './common/Modal';
import ConfirmationModal from './common/ConfirmationModal';
import { motion, AnimatePresence } from 'framer-motion';

const TeamsView: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, selectedGroupId, teamNotes = {}, coyoteTeamNotes = {} } = state;
    
    const [teamType, setTeamType] = useState<'base' | 'coyote'>('base');
    const [editingTeam, setEditingTeam] = useState<{ name: string; isCoyote: boolean } | null>(null);
    const [teamNote, setTeamNote] = useState('');
    const [newTeamName, setNewTeamName] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ name: string; isCoyote: boolean } | null>(null);

    const group = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);

    useEffect(() => {
        if (!selectedGroupId && groups.length > 0) {
            dispatch({ type: 'SET_SELECTED_GROUP', payload: groups[0].id });
        }
    }, [groups, selectedGroupId, dispatch]);

    const teams = useMemo(() => {
        if (!group) return [];
        const isCoyote = teamType === 'coyote';
        const teamMap = new Map<string, { student: Student; groupName: string }[]>();
        
        // --- LÓGICA DE AGREGACIÓN ---
        if (isCoyote) {
            // Equipos Coyote son globales para el mismo cuatrimestre
            const targetQuarter = group.quarter;
            const groupsInSameQuarter = groups.filter(g => g.quarter === targetQuarter);
            
            groupsInSameQuarter.forEach(g => {
                g.students.forEach(s => {
                    if (s.teamCoyote) {
                        if (!teamMap.has(s.teamCoyote)) teamMap.set(s.teamCoyote, []);
                        teamMap.get(s.teamCoyote)!.push({ student: s, groupName: g.name });
                    }
                });
            });
        } else {
            // Equipos Base son estrictamente locales del grupo seleccionado
            group.students.forEach(s => {
                if (s.team) {
                    if (!teamMap.has(s.team)) teamMap.set(s.team, []);
                    teamMap.get(s.team)!.push({ student: s, groupName: group.name });
                }
            });
        }

        return Array.from(teamMap.entries()).map(([name, members]) => ({
            name,
            members,
            note: (isCoyote ? coyoteTeamNotes[name] : teamNotes[name]) || ''
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [group, teamType, teamNotes, coyoteTeamNotes, groups]);

    const handleOpenEdit = (name: string, note: string) => {
        setEditingTeam({ name, isCoyote: teamType === 'coyote' });
        setNewTeamName(name);
        setTeamNote(note);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = () => {
        if (!editingTeam) return;
        
        // 1. Update Note
        dispatch({ 
            type: 'UPDATE_TEAM_NOTE', 
            payload: { teamName: editingTeam.name, note: teamNote, isCoyote: editingTeam.isCoyote } 
        });

        // 2. Rename if changed
        if (newTeamName.trim() && newTeamName !== editingTeam.name) {
            dispatch({ 
                type: 'RENAME_TEAM', 
                payload: { oldName: editingTeam.name, newName: newTeamName.trim(), isCoyote: editingTeam.isCoyote } 
            });
        }

        setIsEditModalOpen(false);
        setEditingTeam(null);
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Equipo actualizado.', type: 'success' } });
    };

    const handleDeleteTeam = () => {
        if (confirmDelete) {
            dispatch({ 
                type: 'DELETE_TEAM', 
                payload: { teamName: confirmDelete.name, isCoyote: confirmDelete.isCoyote } 
            });
            setConfirmDelete(null);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Equipo disuelto.', type: 'info' } });
        }
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

                    <div className="flex gap-2 w-full md:w-auto">
                        <Button variant="secondary" size="sm" onClick={generateTeams} className="flex-1 md:flex-none">
                            <Icon name="grid" className="w-4 h-4" /> Generar Aleatorio
                        </Button>
                    </div>
                </div>
                
                {teamType === 'coyote' && group && (
                    <div className="bg-orange-50 border border-orange-100 p-2 rounded-xl flex items-center gap-2">
                        <Icon name="info" className="w-4 h-4 text-orange-500 shrink-0" />
                        <p className="text-[10px] font-bold text-orange-700 uppercase">
                            Vista Global Cuatrimestre {group.quarter}: Mostrando alumnos de todos los grupos {group.quarter} que comparten el mismo nombre de equipo.
                        </p>
                    </div>
                )}
            </div>

            {group ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
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
                                        <div className={`p-4 border-b border-border-color flex justify-between items-center ${teamType === 'coyote' ? 'bg-orange-50' : 'bg-indigo-50'}`}>
                                            <div className="min-w-0">
                                                <h4 className={`font-black text-sm truncate uppercase tracking-tight ${teamType === 'coyote' ? 'text-orange-700' : 'text-indigo-700'}`}>{team.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{team.members.length} INTEGRANTES</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleOpenEdit(team.name, team.note)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-primary hover:border-primary transition-all shadow-sm"><Icon name="edit-3" className="w-4 h-4"/></button>
                                                <button onClick={() => setConfirmDelete({ name: team.name, isCoyote: teamType === 'coyote' })} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"><Icon name="trash-2" className="w-4 h-4"/></button>
                                            </div>
                                        </div>

                                        <div className="p-4 flex-1 flex flex-col space-y-4">
                                            <div className="space-y-1">
                                                <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Integrantes</h5>
                                                <div className="flex flex-col gap-1">
                                                    {team.members.map(m => (
                                                        <div key={m.student.id} className="text-xs font-bold text-slate-700 bg-white border border-slate-100 px-2 py-1 rounded-lg flex justify-between items-center gap-2">
                                                            <span className="truncate">{m.student.name}</span>
                                                            <span className="shrink-0 text-[8px] font-black bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">{m.groupName}</span>
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
                            <p className="font-black uppercase tracking-widest text-sm">No hay equipos {teamType === 'coyote' ? 'Coyote' : 'Base'} asignados.</p>
                            <p className="text-xs mt-2">Usa el editor de alumnos para asignar equipos o genera aleatorios.</p>
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
                            className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-primary font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase text-slate-500 mb-1">Notas de Seguimiento</label>
                        <textarea 
                            value={teamNote} 
                            onChange={e => setTeamNote(e.target.value)}
                            rows={4}
                            className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-primary text-sm"
                            placeholder="Añade observaciones sobre el desempeño del equipo..."
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
                <p className="text-xs mt-2 text-slate-400">Los integrantes dejarán de tener este equipo asignado, pero sus datos personales no se verán afectados.</p>
            </ConfirmationModal>
        </div>
    );
};

export default TeamsView;
