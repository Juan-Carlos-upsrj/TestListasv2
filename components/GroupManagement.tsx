
import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Group, Student, DayOfWeek, EvaluationType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import ConfirmationModal from './common/ConfirmationModal';
import { DAYS_OF_WEEK, GROUP_COLORS } from '../constants';
import { motion } from 'framer-motion';

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

export const BulkStudentForm: React.FC<{
    onAdd: (students: Student[]) => void;
    onCancel: () => void;
}> = ({ onAdd, onCancel }) => {
    const [text, setText] = useState('');
    const handleAdd = () => {
        const lines = text.split('\n').filter(l => l.trim());
        const students: Student[] = lines.map(line => {
            const parts = line.split('\t');
            if (parts.length === 1) {
                const commaParts = line.split(',');
                if (commaParts.length > 1) return { id: uuidv4(), name: commaParts[0].trim(), matricula: commaParts[1].trim() };
            }
            return {
                id: uuidv4(),
                name: parts[0]?.trim() || 'Alumno',
                matricula: parts[1]?.trim() || '',
            };
        });
        onAdd(students);
    };
    return (
        <div className="space-y-4">
            <p className="text-sm text-text-secondary">Pega una lista de alumnos. Formato sugerido: <strong>Nombre [Tabulador] Matrícula</strong>.</p>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Juan Pérez\t2023001" className="w-full p-3 border border-border-color rounded-xl bg-surface h-48 font-mono text-xs focus:ring-2 focus:ring-primary"/>
            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                <Button onClick={handleAdd} disabled={!text.trim()}><Icon name="list-plus" className="w-4 h-4" /> Agregar Alumnos</Button>
            </div>
        </div>
    );
};

export const GroupForm: React.FC<{ group?: Group; existingGroups?: Group[]; onSave: (group: Group) => void; onCancel: () => void; }> = ({ group, existingGroups = [], onSave, onCancel }) => {
    const { state, dispatch } = useContext(AppContext);
    const { groupTutors = {}, settings } = state;
    const [name, setName] = useState(group?.name || '');
    const [subject, setSubject] = useState(group?.subject || '');
    const [subjectShortName, setSubjectShortName] = useState(group?.subjectShortName || '');
    const [quarter, setQuarter] = useState(group?.quarter || '');
    const [classDays, setClassDays] = useState<DayOfWeek[]>(group?.classDays || []);
    const [color, setColor] = useState(group?.color || GROUP_COLORS[0].name);
    const [p1Types, setP1Types] = useState<EvaluationType[]>(group?.evaluationTypes?.partial1 || [{ id: uuidv4(), name: 'General', weight: 100 }]);
    const [p2Types, setP2Types] = useState<EvaluationType[]>(group?.evaluationTypes?.partial2 || [{ id: uuidv4(), name: 'General', weight: 100 }]);
    const [tutorName, setTutorName] = useState(group ? groupTutors[group.id] || settings.professorName : settings.professorName);

    const handleDayToggle = (day: DayOfWeek) => setClassDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    
    useEffect(() => {
        if (group?.evaluationTypes) {
             setP1Types(group.evaluationTypes.partial1);
             setP2Types(group.evaluationTypes.partial2);
        }
    }, [group?.evaluationTypes]);

    const handleCopyCriteria = (sourceGroupId: string) => {
        const source = existingGroups.find(g => g.id === sourceGroupId);
        if (source) {
            setP1Types(source.evaluationTypes.partial1.map(t => ({ ...t, id: uuidv4() })));
            setP2Types(source.evaluationTypes.partial2.map(t => ({ ...t, id: uuidv4() })));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault(); 
        if (p1Types.reduce((s, t) => s + Number(t.weight), 0) !== 100 || p2Types.reduce((s, t) => s + Number(t.weight), 0) !== 100) {
             alert('La suma de las ponderaciones debe ser 100%.'); return;
        }
        const groupId = group?.id || uuidv4();
        dispatch({ type: 'SET_GROUP_TUTOR', payload: { groupId, tutorName: tutorName.trim() } });
        onSave({ id: groupId, name, subject, subjectShortName: subjectShortName.trim().toUpperCase() || undefined, quarter, classDays, students: group?.students || [], color, evaluationTypes: { partial1: p1Types, partial2: p2Types } });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Nombre</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Cuatrimestre</label><input type="text" placeholder="Ej. 5º" value={quarter} onChange={e => setQuarter(e.target.value)} className="w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Materia</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} required className="w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Abrev.</label><input type="text" value={subjectShortName} onChange={e => setSubjectShortName(e.target.value)} maxLength={8} className="w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary font-bold"/></div>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <label className="block text-[10px] font-black uppercase text-indigo-600 mb-1">Tutor</label>
                <div className="relative">
                    <Icon name="graduation-cap" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                    <input type="text" value={tutorName} onChange={e => setTutorName(e.target.value)} placeholder="Nombre del Tutor" className="block w-full pl-9 pr-3 py-2 border border-indigo-200 rounded-lg bg-white text-sm focus:ring-1 focus:ring-indigo-500 font-bold"/>
                </div>
            </div>
            <div><label className="block text-xs font-medium mb-2">Días</label><div className="flex flex-wrap gap-1.5">{DAYS_OF_WEEK.map(day => (<button type="button" key={day} onClick={() => handleDayToggle(day)} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${classDays.includes(day) ? 'bg-primary text-primary-text' : 'bg-surface-secondary hover:bg-border-color'}`}>{day}</button>))}</div></div>
            <div><label className="block text-xs font-medium mb-2">Color</label><div className="flex flex-wrap gap-2.5">{GROUP_COLORS.map(c => (<button type="button" key={c.name} onClick={() => setColor(c.name)} className={`w-7 h-7 rounded-full ${c.bg} transition-transform hover:scale-110 ${color === c.name ? 'ring-2 ring-offset-2 ring-primary ring-offset-surface' : ''}`}/>))}</div></div>
            <div className="space-y-3">
                <div className="flex justify-between items-center"><label className="text-sm font-bold">Ponderación</label>{existingGroups.length > 1 && <select className="text-[10px] p-1 border border-border-color rounded bg-surface" onChange={e => { if(e.target.value) { handleCopyCriteria(e.target.value); e.target.value = ""; } }} defaultValue=""><option value="" disabled>Copiar de...</option>{existingGroups.filter(g => g.id !== group?.id).map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}</select>}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><EvaluationTypesEditor types={p1Types} onTypesChange={setP1Types} partialName="Parcial 1" /><EvaluationTypesEditor types={p2Types} onTypesChange={setP2Types} partialName="Parcial 2" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="secondary" onClick={onCancel} size="sm">Cancelar</Button><Button type="submit" size="sm">{group ? 'Guardar' : 'Crear'}</Button></div>
        </form>
    );
};

const GroupManagement: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, selectedGroupId } = state;
    const [isGroupModalOpen, setGroupModalOpen] = useState(false);
    const [isStudentModalOpen, setStudentModalOpen] = useState(false);
    const [isBulkModalOpen, setBulkModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);
    const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<Group | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const group = groups.find(g => g.id === selectedGroupId);
    
    const filteredStudents = useMemo(() => {
        if (!group) return [];
        const term = searchTerm.toLowerCase();
        return group.students.filter(s => 
            s.name.toLowerCase().includes(term) || 
            (s.matricula && s.matricula.toLowerCase().includes(term))
        );
    }, [group, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-border-color shadow-sm">
                <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                    <Icon name="users" className="w-6 h-6" /> Gestión de Grupos
                </h2>
                <Button onClick={() => { setEditingGroup(undefined); setGroupModalOpen(true); }} size="sm">
                    <Icon name="plus" className="w-4 h-4" /> Nuevo Grupo
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {groups.map(g => {
                    const colorObj = GROUP_COLORS.find(c => c.name === g.color) || GROUP_COLORS[0];
                    const isSelected = selectedGroupId === g.id;
                    return (
                        <div key={g.id} onClick={() => dispatch({ type: 'SET_SELECTED_GROUP', payload: g.id })} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-md scale-[1.02]' : 'border-border-color bg-surface hover:border-primary/40'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorObj.bg} ${colorObj.text}`}><Icon name="users" className="w-4 h-4" /></div>
                                <div className="flex gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingGroup(g); setGroupModalOpen(true); }} className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-primary"><Icon name="edit-3" className="w-3.5 h-3.5" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteGroup(g); }} className="p-1 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-500"><Icon name="trash-2" className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                            <h3 className="font-bold text-base truncate">{g.name}</h3>
                            <p className="text-xs text-text-secondary truncate">{g.subject}</p>
                            <div className="mt-2 pt-2 border-t border-border-color flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>{g.students.length} Alumnos</span>
                                <span className="bg-slate-100 px-1.5 rounded-full">{g.quarter || 'N/A'}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {group && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface rounded-2xl border border-border-color shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border-color bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h3 className="font-bold text-lg">{group.name}</h3>
                            <p className="text-xs text-text-secondary">{group.subject}</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" placeholder="Buscar alumno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-1.5 border border-border-color rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary"/>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => setBulkModalOpen(true)} title="Importar"><Icon name="list-plus" className="w-4 h-4" /></Button>
                            <Button size="sm" onClick={() => setStudentModalOpen(true)} title="Agregar"><Icon name="user-plus" className="w-4 h-4" /></Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100/50 text-slate-500 uppercase text-[10px] font-black sticky top-0 z-10 border-b border-border-color">
                                <tr>
                                    <th className="p-3 w-12 text-center">#</th>
                                    <th className="p-3">Nombre</th>
                                    <th className="p-3">Matrícula</th>
                                    <th className="p-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color">
                                {filteredStudents.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-slate-50/50">
                                        <td className="p-3 text-slate-400 font-bold text-center">{idx + 1}</td>
                                        <td className="p-3 font-bold text-slate-700">{s.name}</td>
                                        <td className="p-3 font-mono text-xs text-slate-500">{s.matricula || '-'}</td>
                                        <td className="p-3 flex justify-center gap-1">
                                            <button onClick={() => { const n = prompt("Nombre:", s.name); if(n) dispatch({ type: 'SAVE_STUDENT', payload: { groupId: group.id, student: { ...s, name: n } } }); }} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"><Icon name="edit-3" className="w-4 h-4" /></button>
                                            <button onClick={() => { if(confirm(`¿Eliminar a ${s.name}?`)) dispatch({ type: 'DELETE_STUDENT', payload: { groupId: group.id, studentId: s.id } }); }} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"><Icon name="trash-2" className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredStudents.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-slate-400 italic">No se encontraron alumnos.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            <Modal isOpen={isGroupModalOpen} onClose={() => setGroupModalOpen(false)} title={editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'} size="xl">
                <GroupForm group={editingGroup} existingGroups={groups} onSave={(g) => { dispatch({ type: 'SAVE_GROUP', payload: g }); setGroupModalOpen(false); }} onCancel={() => setGroupModalOpen(false)} />
            </Modal>

            <Modal isOpen={isStudentModalOpen} onClose={() => setStudentModalOpen(false)} title="Agregar Alumno">
                <form onSubmit={(e) => {
                    e.preventDefault(); const fd = new FormData(e.currentTarget); const name = fd.get('name') as string; const matr = fd.get('matricula') as string;
                    if(name.trim()){ dispatch({ type: 'SAVE_STUDENT', payload: { groupId: group!.id, student: { id: uuidv4(), name, matricula: matr } } }); setStudentModalOpen(false); }
                }} className="space-y-4">
                    <div><label className="block text-xs font-bold mb-1 uppercase text-slate-500">Nombre</label><input name="name" required autoFocus className="w-full p-2.5 border border-border-color rounded-xl bg-surface focus:ring-2 focus:ring-primary" placeholder="Ej. Juan Pérez" /></div>
                    <div><label className="block text-xs font-bold mb-1 uppercase text-slate-500">Matrícula</label><input name="matricula" className="w-full p-2.5 border border-border-color rounded-xl bg-surface focus:ring-2 focus:ring-primary" placeholder="Opcional" /></div>
                    <div className="flex justify-end gap-3 pt-4"><Button variant="secondary" onClick={() => setStudentModalOpen(false)}>Cancelar</Button><Button type="submit">Guardar</Button></div>
                </form>
            </Modal>

            <Modal isOpen={isBulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Importar Alumnos" size="lg">
                <BulkStudentForm onAdd={(s) => { dispatch({ type: 'BULK_ADD_STUDENTS', payload: { groupId: group!.id, students: s } }); setBulkModalOpen(false); }} onCancel={() => setBulkModalOpen(false)} />
            </Modal>

            <ConfirmationModal isOpen={!!confirmDeleteGroup} onClose={() => setConfirmDeleteGroup(null)} onConfirm={() => { dispatch({ type: 'DELETE_GROUP', payload: confirmDeleteGroup!.id }); setConfirmDeleteGroup(null); }} title="Eliminar Grupo" variant="danger">
                ¿Deseas eliminar permanentemente el grupo <strong>{confirmDeleteGroup?.name}</strong>?
            </ConfirmationModal>
        </div>
    );
};

export default GroupManagement;
