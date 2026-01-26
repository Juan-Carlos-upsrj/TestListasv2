import React, { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Student, TutorshipEntry } from '../types';
import Icon from './icons/Icon';
import Button from './common/Button';
import Modal from './common/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { calculatePartialAverage } from '../services/gradeCalculation';
import { syncTutorshipData, normalizeForMatch } from '../services/syncService';

interface TutorshipFormProps {
    student: Student;
    initialEntry?: TutorshipEntry;
    onSave: (entry: TutorshipEntry) => void;
    onCancel: () => void;
}

const TutorshipForm: React.FC<TutorshipFormProps> = ({ student, initialEntry, onSave, onCancel }) => {
    const [strengths, setStrengths] = useState(initialEntry?.strengths || '');
    const [opportunities, setOpportunities] = useState(initialEntry?.opportunities || '');
    const [summary, setSummary] = useState(initialEntry?.summary || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ strengths, opportunities, summary });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm font-medium text-slate-500">Editando ficha de: <span className="text-primary font-bold">{student.name}</span></p>
            <div>
                <label className="block text-xs font-black uppercase text-text-secondary mb-1">Fortalezas</label>
                <textarea value={strengths} onChange={e => setStrengths(e.target.value)} placeholder="Habilidades, aptitudes positivas..." className="w-full p-2 border-2 border-border-color rounded-xl bg-surface focus:ring-2 focus:ring-primary min-h-[80px]"/>
            </div>
            <div>
                <label className="block text-xs font-black uppercase text-text-secondary mb-1">Áreas de Oportunidad</label>
                <textarea value={opportunities} onChange={e => setOpportunities(e.target.value)} placeholder="Debilidades, retos..." className="w-full p-2 border-2 border-border-color rounded-xl bg-surface focus:ring-2 focus:ring-primary min-h-[80px]"/>
            </div>
            <div>
                <label className="block text-xs font-black uppercase text-text-secondary mb-1">Resumen Académico</label>
                <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Notas generales para otros profesores..." className="w-full p-2 border-2 border-border-color rounded-xl bg-surface focus:ring-2 focus:ring-primary min-h-[100px]"/>
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">Guardar Ficha</Button>
            </div>
        </form>
    );
};

const TutorshipView: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, selectedGroupId, tutorshipData = {}, groupTutors = {}, settings, attendance, evaluations, grades } = state;
    
    const [searchTerm, setSearchTerm] = useState('');
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const group = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
    
    // AUTO-SYNC: Cargar datos al entrar o cambiar de grupo
    useEffect(() => {
        if (selectedGroupId && settings.apiUrl) {
            handleSync(true); // sync silencioso de fondo
        }
    }, [selectedGroupId]);

    useEffect(() => {
        if (!selectedGroupId && groups.length > 0) {
            dispatch({ type: 'SET_SELECTED_GROUP', payload: groups[0].id });
        }
    }, [groups, selectedGroupId, dispatch]);

    const filteredStudents = useMemo(() => {
        if (!group) return [];
        const term = searchTerm.toLowerCase();
        return group.students.filter(s => 
            s.name.toLowerCase().includes(term) || 
            (s.matricula && s.matricula.toLowerCase().includes(term))
        );
    }, [group, searchTerm]);

    const currentTutor = useMemo(() => {
        if (!group) return '';
        const tutor = groupTutors[group.id];
        if (tutor) return tutor;
        return isSyncing ? 'Buscando...' : 'Sin asignar';
    }, [group, groupTutors, isSyncing]);

    // MEJORA: canEdit ahora usa normalización para evitar errores de espacios o acentos
    const canEdit = useMemo(() => {
        if (!currentTutor || currentTutor.includes('Sin asignar')) return false;
        return normalizeForMatch(settings.professorName) === normalizeForMatch(currentTutor);
    }, [settings.professorName, currentTutor]);

    const handleSaveEntry = (entry: TutorshipEntry) => {
        if (editingStudent) {
            dispatch({ type: 'UPDATE_TUTORSHIP', payload: { studentId: editingStudent.id, entry } });
            setIsEditorOpen(false);
            setEditingStudent(null);
            // Auto-subir cambios tras editar para no perder nada
            setTimeout(() => handleSync(true), 500);
        }
    };

    const handleSync = async (silent = false) => {
        if (!silent) setIsSyncing(true);
        try {
            await syncTutorshipData(state, dispatch);
        } catch (e) {
            console.error("Tutorship sync failed", e);
        } finally {
            if (!silent) setIsSyncing(false);
        }
    };

    const handleManualSetTutor = () => {
        if (!group) return;
        const name = prompt("Escribe el nombre del Tutor de este grupo:", currentTutor.includes('Sin') ? settings.professorName : currentTutor);
        if (name !== null) {
            dispatch({ type: 'SET_GROUP_TUTOR', payload: { groupId: group.id, tutorName: name } });
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
                        <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-text-secondary tracking-widest leading-none">Tutor Académico (Servidor)</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${canEdit ? 'text-indigo-700' : 'text-slate-600'}`}>{currentTutor}</span>
                                <button onClick={handleManualSetTutor} title="Cambio manual local" className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-primary transition-all"><Icon name="edit-3" className="w-3.5 h-3.5"/></button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input type="text" className="block w-full pl-9 pr-3 py-2 border-2 border-border-color rounded-xl bg-white text-sm focus:ring-2 focus:ring-primary" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => handleSync(false)} 
                            disabled={isSyncing}
                            className={`${canEdit ? 'bg-indigo-600 !text-white hover:bg-indigo-700' : 'bg-white border-indigo-200 text-indigo-700'} shadow-sm`}
                        >
                            <div className="flex items-center gap-2">
                                <Icon name="download-cloud" className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                                <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar Datos'}</span>
                            </div>
                        </Button>
                    </div>
                </div>
                
                {group && (
                    <motion.div 
                        initial={{ opacity: 0, y: -5 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-xl transition-all ${canEdit ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}
                    >
                        <Icon name={canEdit ? "check-circle-2" : "info"} className="w-4 h-4 shrink-0" />
                        <p className="text-xs font-medium">
                            {canEdit ? 
                                <span><b>Modo Tutor.</b> Tienes permisos para editar estas fichas.</span> : 
                                <span><b>Modo Lectura.</b> Notas registradas por <b>{currentTutor}</b>. Solo el tutor puede realizar cambios permanentes.</span>
                            }
                        </p>
                    </motion.div>
                )}
            </div>

            {group ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {filteredStudents.map((student) => {
                                const entry = tutorshipData[student.id];
                                const studentGrades = grades[group.id]?.[student.id] || {};
                                const groupEvals = evaluations[group.id] || [];
                                const studentAtt = attendance[group.id]?.[student.id] || {};
                                const p1 = calculatePartialAverage(group, 1, groupEvals, studentGrades, settings, studentAtt);
                                const p2 = calculatePartialAverage(group, 2, groupEvals, studentGrades, settings, studentAtt);
                                const avg = (p1 !== null && p2 !== null) ? (p1 + p2) / 2 : (p1 || p2 || 0);

                                return (
                                    <motion.div layout key={student.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface rounded-2xl border-2 border-border-color shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden relative h-full min-h-[340px]">
                                        <div className="p-4 bg-slate-50 border-b border-border-color flex justify-between items-start">
                                            <div className="min-w-0">
                                                <h4 className="font-black text-sm text-slate-800 truncate leading-tight uppercase tracking-tighter">{student.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{student.matricula || 'SIN MATRÍCULA'}</p>
                                            </div>
                                            {canEdit && (
                                                <button onClick={() => { setEditingStudent(student); setIsEditorOpen(true); }} className="p-2 bg-white border border-slate-200 rounded-xl text-primary hover:bg-primary hover:text-white transition-all shadow-sm"><Icon name="edit-3" className="w-4 h-4"/></button>
                                            )}
                                        </div>

                                        <div className="flex-1 p-4 space-y-4">
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div className="bg-white border border-slate-100 p-2 rounded-xl text-center shadow-inner">
                                                    <span className="text-[8px] font-black uppercase text-slate-400 block">Promedio</span>
                                                    <span className={`text-xs font-black ${avg >= 7 ? 'text-emerald-600' : 'text-rose-600'}`}>{avg.toFixed(1)}</span>
                                                </div>
                                                <div className="bg-white border border-slate-100 p-2 rounded-xl text-center shadow-inner">
                                                    <span className="text-[8px] font-black uppercase text-slate-400 block">Situación</span>
                                                    <span className="text-[9px] font-black text-indigo-600 truncate">{student.isRepeating ? 'RECURS.' : 'REGULAR'}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <h5 className="text-[9px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5 mb-1"><Icon name="check-circle-2" className="w-3 h-3" /> Fortalezas</h5>
                                                    <p className="text-[11px] leading-relaxed text-slate-600 italic line-clamp-3 overflow-hidden">{entry?.strengths || 'Sin registro...'}</p>
                                                </div>
                                                <div>
                                                    <h5 className="text-[9px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5 mb-1"><Icon name="info" className="w-3 h-3" /> Oportunidades</h5>
                                                    <p className="text-[11px] leading-relaxed text-slate-600 italic line-clamp-3 overflow-hidden">{entry?.opportunities || 'Sin registro...'}</p>
                                                </div>
                                                <div className="pt-2 border-t border-slate-100">
                                                    <h5 className="text-[9px] font-black uppercase tracking-widest text-indigo-700 flex items-center gap-1.5 mb-1"><Icon name="book-marked" className="w-3 h-3" /> Académico</h5>
                                                    <p className="text-[11px] font-medium leading-relaxed text-slate-700 bg-indigo-50/30 p-2 rounded-lg border border-indigo-100/50 line-clamp-4 overflow-hidden">{entry?.summary || 'Sin comentarios.'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30 py-20">
                    <Icon name="book-marked" className="w-20 h-20 mb-4"/>
                    <h3 className="text-xl font-black uppercase">Tutoreo Académico</h3>
                    <p className="text-sm">Selecciona un grupo para ver sus fichas.</p>
                </div>
            )}

            {editingStudent && (
                <Modal isOpen={isEditorOpen} onClose={() => {setIsEditorOpen(false); setEditingStudent(null);}} title="Editar Ficha" size="lg">
                    <TutorshipForm student={editingStudent} initialEntry={tutorshipData[editingStudent.id]} onSave={handleSaveEntry} onCancel={() => {setIsEditorOpen(false); setEditingStudent(null);}} />
                </Modal>
            )}
        </div>
    );
};

export default TutorshipView;