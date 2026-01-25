
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Student, TutorshipEntry } from '../types';
import Icon from './icons/Icon';
import Button from './common/Button';
import Modal from './common/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { calculatePartialAverage } from '../services/gradeCalculation';

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
                <textarea 
                    value={strengths} 
                    onChange={e => setStrengths(e.target.value)}
                    placeholder="Habilidades, aptitudes positivas, liderazgo..."
                    className="w-full p-2 border-2 border-border-color rounded-xl bg-surface focus:ring-2 focus:ring-primary min-h-[80px]"
                />
            </div>
            
            <div>
                <label className="block text-xs font-black uppercase text-text-secondary mb-1">Áreas de Oportunidad</label>
                <textarea 
                    value={opportunities} 
                    onChange={e => setOpportunities(e.target.value)}
                    placeholder="Debilidades, retos, aspectos a mejorar..."
                    className="w-full p-2 border-2 border-border-color rounded-xl bg-surface focus:ring-2 focus:ring-primary min-h-[80px]"
                />
            </div>
            
            <div>
                <label className="block text-xs font-black uppercase text-text-secondary mb-1">Resumen de Desempeño</label>
                <textarea 
                    value={summary} 
                    onChange={e => setSummary(e.target.value)}
                    placeholder="Comportamiento en clase, participación, notas generales para otros profes..."
                    className="w-full p-2 border-2 border-border-color rounded-xl bg-surface focus:ring-2 focus:ring-primary min-h-[100px]"
                />
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
    
    const group = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
    
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
            (s.matricula && s.matricula.toLowerCase().includes(term)) ||
            (s.nickname && s.nickname.toLowerCase().includes(term))
        );
    }, [group, searchTerm]);

    const currentTutor = group ? groupTutors[group.id] || 'No asignado' : '';
    const canEdit = settings.professorName.trim().toLowerCase() === currentTutor.trim().toLowerCase();

    const handleSaveEntry = (entry: TutorshipEntry) => {
        if (editingStudent) {
            dispatch({ type: 'UPDATE_TUTORSHIP', payload: { studentId: editingStudent.id, entry } });
            setIsEditorOpen(false);
            setEditingStudent(null);
        }
    };

    const handleSetTutor = () => {
        if (!group) return;
        const name = prompt("Escribe el nombre del Tutor de este grupo:", settings.professorName);
        if (name !== null) {
            dispatch({ type: 'SET_GROUP_TUTOR', payload: { groupId: group.id, tutorName: name } });
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="bg-surface p-4 mb-6 rounded-2xl border border-border-color shadow-sm space-y-4 shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
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
                            <span className="text-[10px] font-black uppercase text-text-secondary tracking-widest leading-none">Tutor Académico</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-indigo-700">{currentTutor}</span>
                                <button onClick={handleSetTutor} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-primary transition-all"><Icon name="edit-3" className="w-3.5 h-3.5"/></button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Icon name="search" className="h-4 w-4" />
                        </div>
                        <input 
                            type="text" 
                            className="block w-full pl-9 pr-3 py-2 border-2 border-border-color rounded-xl bg-white text-sm focus:ring-2 focus:ring-primary" 
                            placeholder="Buscar alumno..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                </div>
                
                {!canEdit && group && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
                        <Icon name="info" className="w-4 h-4 shrink-0" />
                        <p className="text-xs font-medium">Estás en modo <strong>Solo Lectura</strong>. Únicamente el tutor <b>({currentTutor})</b> puede actualizar las fichas.</p>
                    </div>
                )}
            </div>

            {group ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {filteredStudents.map((student) => {
                                const entry = tutorshipData[student.id];
                                
                                // Calcular mini-estadísticas para la ficha
                                const studentGrades = grades[group.id]?.[student.id] || {};
                                const groupEvals = evaluations[group.id] || [];
                                const studentAtt = attendance[group.id]?.[student.id] || {};
                                
                                const p1 = calculatePartialAverage(group, 1, groupEvals, studentGrades, settings, studentAtt);
                                const p2 = calculatePartialAverage(group, 2, groupEvals, studentGrades, settings, studentAtt);
                                const avg = (p1 !== null && p2 !== null) ? (p1 + p2) / 2 : (p1 || p2 || 0);

                                return (
                                    <motion.div 
                                        layout
                                        key={student.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-surface rounded-2xl border-2 border-border-color shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden relative group/card h-full min-h-[320px]"
                                    >
                                        <div className="p-4 bg-slate-50 border-b border-border-color flex justify-between items-start">
                                            <div className="min-w-0">
                                                <h4 className="font-black text-sm text-slate-800 truncate leading-tight uppercase tracking-tighter">{student.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{student.matricula || 'SIN MATRÍCULA'}</p>
                                            </div>
                                            {canEdit && (
                                                <button 
                                                    onClick={() => { setEditingStudent(student); setIsEditorOpen(true); }}
                                                    className="p-2 bg-white border border-slate-200 rounded-xl text-primary hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                                                    title="Editar Ficha"
                                                >
                                                    <Icon name="edit-3" className="w-4 h-4"/>
                                                </button>
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
                                                    <h5 className="text-[9px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5 mb-1">
                                                        <Icon name="check-circle-2" className="w-3 h-3" /> Fortalezas
                                                    </h5>
                                                    <p className="text-[11px] leading-relaxed text-slate-600 italic">
                                                        {entry?.strengths || 'Pendiente de registro...'}
                                                    </p>
                                                </div>
                                                
                                                <div>
                                                    <h5 className="text-[9px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5 mb-1">
                                                        <Icon name="info" className="w-3 h-3" /> Áreas de Oportunidad
                                                    </h5>
                                                    <p className="text-[11px] leading-relaxed text-slate-600 italic">
                                                        {entry?.opportunities || 'Pendiente de registro...'}
                                                    </p>
                                                </div>

                                                <div className="pt-2 border-t border-slate-100">
                                                    <h5 className="text-[9px] font-black uppercase tracking-widest text-indigo-700 flex items-center gap-1.5 mb-1">
                                                        <Icon name="book-marked" className="w-3 h-3" /> Desempeño Académico
                                                    </h5>
                                                    <p className="text-[11px] font-medium leading-relaxed text-slate-700 bg-indigo-50/30 p-2 rounded-lg border border-indigo-100/50">
                                                        {entry?.summary || 'Sin comentarios académicos generales.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="px-4 py-2 bg-slate-50 border-t border-border-color flex items-center justify-between opacity-60">
                                             <span className="text-[8px] font-bold uppercase text-slate-400">Ficha de Tutoreo</span>
                                             <Icon name="graduation-cap" className="w-3.5 h-3.5 text-slate-300"/>
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
                    <p className="text-sm">Selecciona un grupo para ver las fichas de acompañamiento.</p>
                </div>
            )}

            {editingStudent && (
                <Modal 
                    isOpen={isEditorOpen} 
                    onClose={() => setIsEditorOpen(false)} 
                    title="Editar Ficha de Tutoreo"
                    size="lg"
                >
                    <TutorshipForm 
                        student={editingStudent} 
                        initialEntry={tutorshipData[editingStudent.id]}
                        onSave={handleSaveEntry} 
                        onCancel={() => setIsEditorOpen(false)} 
                    />
                </Modal>
            )}
        </div>
    );
};

export default TutorshipView;
