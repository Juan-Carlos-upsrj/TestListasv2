
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

/**
 * Component for editing evaluation types/criteria within a group.
 */
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

/**
 * Component for bulk adding students from text input.
 */
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
                // Try comma if tab is not present
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
            <p className="text-sm text-text-secondary">Pega una lista de alumnos. Formato sugerido: <strong>Nombre [Tabulador] Matrícula</strong> o <strong>Nombre, Matrícula</strong>.</p>
            <textarea 
                value={text} 
                onChange={e => setText(e.target.value)} 
                placeholder="Juan Pérez\t2023001&#10;María García\t2023002" 
                className="w-full p-3 border border-border-color rounded-xl bg-surface h-48 font-mono text-xs focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                <Button onClick={handleAdd} disabled={!text.trim()}>
                    <Icon name="list-plus" className="w-4 h-4" /> Agregar {text.split('\n').filter(l => l.trim()).length} Alumnos
                </Button>
            </div>
        </div>
    );
};

/**
 * Form component for creating or editing group information.
 */
export const GroupForm: React.FC<{ group?: Group; existingGroups?: Group[]; onSave: (group: Group) => void; onCancel: () => void; onImportCriteria: (groupId: string) => void; }> = ({ group, existingGroups = [], onSave, onCancel, onImportCriteria }) => {
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
        if (group && group.evaluationTypes) {
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
        const p1w = p1Types.reduce((s, t) => s + Number(t.weight), 0);
        const p2w = p2Types.reduce((s, t) => s + Number(t.weight), 0);
        
        if (!name || !subject) { alert('Nombre y materia requeridos.'); return; }
        if (p1w !== 100 || p2w !== 100) { alert('La suma de las ponderaciones debe ser 100%.'); return; }
        
        const groupId = group?.id || uuidv4();
        
        dispatch({ type: 'SET_GROUP_TUTOR', payload: { groupId, tutorName: tutorName.trim() } });
        
        onSave({ 
            id: groupId, 
            name, 
            subject, 
            subjectShortName: subjectShortName.trim().toUpperCase() || undefined, 
            quarter, 
            classDays, 
            students: group?.students || [], 
            color, 
            evaluationTypes: { partial1: p1Types, partial2: p2Types } 
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Nombre del Grupo</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Cuatrimestre</label><input type="text" placeholder="Ej. 5º" value={quarter} onChange={e => setQuarter(e.target.value)} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Materia</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} required className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"/></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium mb-1">Abreviatura Materia</label><input type="text" value={subjectShortName} onChange={e => setSubjectShortName(e.target.value)} maxLength={8} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary font-bold"/></div>
            </div>
            
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <label className="block text-[10px] font-black uppercase text-indigo-600 mb-1 tracking-widest">Tutor Académico</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-400">
                        <Icon name="graduation-cap" className="h-4 w-4" />
                    </div>
                    <input 
                        type="text" 
                        value={tutorName} 
                        onChange={e => setTutorName(e.target.value)} 
                        placeholder="Nombre del Tutor"
                        className="block w-full pl-9 pr-3 py-2 border border-indigo-200 rounded-lg bg-white text-sm focus:ring-1 focus:ring-indigo-500 font-bold"
                    />
                </div>
            </div>

            <div><label className="block text-xs font-medium mb-2">Días de Clase</label><div className="flex flex-wrap gap-1.5">{DAYS_OF_WEEK.map(day => (<button type="button" key={day} onClick={() => handleDayToggle(day)} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${classDays.includes(day) ? 'bg-primary text-primary-text' : 'bg-surface-secondary hover:bg-border-color'}`}>{day}</button>))}</div></div>
            <div><label className="block text-xs font-medium mb-2">Color del Grupo</label><div className="flex flex-wrap gap-2.5">{GROUP_COLORS.map(c => (<button type="button" key={c.name} onClick={() => setColor(c.name)} className={`w-7 h-7 rounded-full ${c.bg} transition-transform hover:scale-110 ${color === c.name ? 'ring-2 ring-offset-2 ring-primary ring-offset-surface' : ''}`}/>))}</div></div>
            <div className="space-y-3">
                <div className="flex justify-between items-center"><label className="text-sm font-bold">Ponderación por Parcial</label>{existingGroups.length > 1 && <select className="text-[10px] p-1 border border-border-color rounded bg-surface focus:ring-1 focus:ring-primary" onChange={e => { if(e.target.value) { handleCopyCriteria(e.target.value); e.target.value = ""; } }} defaultValue=""><option value="" disabled>Copiar de...</option>{existingGroups.filter(g => g.id !== group?.id).map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}</select>}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><EvaluationTypesEditor types={p1Types} onTypesChange={setP1Types} partialName="Parcial 1" /><EvaluationTypesEditor types={p2Types} onTypesChange={setP2Types} partialName="Parcial 2" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="secondary" onClick={onCancel} size="sm">Cancelar</Button><Button type="submit" size="sm">{group ? 'Guardar' : 'Crear'}</Button></div>
        </form>
    );
};

/**
 * Main Group Management view component.
 */
const GroupManagement: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, selectedGroupId } = state;
    const [isGroupModalOpen, setGroupModalOpen] = useState(false);
    const [isStudentModalOpen, setStudentModalOpen] = useState(false);
    const [isBulkModalOpen, setBulkModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);
    const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<Group | null>(null);

    const group = groups.find(g => g.id === selectedGroupId);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-primary">Gestión de Grupos</h2>
                <Button onClick={() => { setEditingGroup(undefined); setGroupModalOpen(true); }}>
                    <Icon name="plus" className="w-4 h-4" /> Nuevo Grupo
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {groups.map(g => {
                    const colorObj = GROUP_COLORS.find(c => c.name === g.color) || GROUP_COLORS[0];
                    return (
                        <div 
                            key={g.id} 
                            onClick={() => dispatch({ type: 'SET_SELECTED_GROUP', payload: g.id })}
                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedGroupId === g.id ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-border-color bg-surface hover:border-primary/50 shadow-sm'}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorObj.bg} ${colorObj.text}`}>
                                    <Icon name="users" className="w-5 h-5" />
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingGroup(g); setGroupModalOpen(true); }} className="p-1.5 hover:bg-surface-secondary rounded-lg text-text-secondary transition-colors" title="Editar"><Icon name="edit-3" className="w-4 h-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteGroup(g); }} className="p-1.5 hover:bg-accent-red-light rounded-lg text-accent-red transition-colors" title="Eliminar"><Icon name="trash-2" className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <h3 className="font-bold text-lg leading-tight truncate">{g.name}</h3>
                            <p className="text-sm text-text-secondary truncate mt-0.5">{g.subject}</p>
                            <div className="mt-4 pt-4 border-t border-border-color flex items-center justify-between">
                                <span className="text-xs font-bold text-text-secondary">{g.students.length} Alumnos</span>
                                <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">{g.quarter || 'N/A'}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {group && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10 bg-surface rounded-2xl border border-border-color overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border-color flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/30">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${GROUP_COLORS.find(c => c.name === group.color)?.bg}`}></span>
                                Alumnos del Grupo: {group.name}
                            </h3>
                            <p className="text-sm text-text-secondary font-medium">{group.subject}</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="secondary" size="sm" onClick={() => setBulkModalOpen(true)} className="flex-1 sm:flex-none">
                                <Icon name="list-plus" className="w-4 h-4" /> Importar
                            </Button>
                            <Button size="sm" onClick={() => setStudentModalOpen(true)} className="flex-1 sm:flex-none">
                                <Icon name="user-plus" className="w-4 h-4" /> Agregar
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-text-secondary uppercase text-[10px] font-black tracking-widest border-b border-border-color">
                                <tr>
                                    <th className="p-4 w-12 text-center">#</th>
                                    <th className="p-4">Nombre</th>
                                    <th className="p-4">Matrícula</th>
                                    <th className="p-4">Equipo</th>
                                    <th className="p-4 text-center w-24">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color">
                                {group.students.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-text-secondary font-bold text-center">{idx + 1}.</td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{s.name}</div>
                                            {s.nickname && <div className="text-[10px] text-text-secondary">"{s.nickname}"</div>}
                                        </td>
                                        <td className="p-4 font-mono text-xs text-slate-500">{s.matricula || '-'}</td>
                                        <td className="p-4">
                                            {s.team ? (
                                                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100">{s.team}</span>
                                            ) : (
                                                <span className="text-slate-300 text-[10px] italic">Sin equipo</span>
                                            )}
                                        </td>
                                        <td className="p-4 flex justify-center gap-1">
                                            <button 
                                                onClick={() => {
                                                    const newName = prompt("Nombre del alumno:", s.name);
                                                    if (newName) dispatch({ type: 'SAVE_STUDENT', payload: { groupId: group.id, student: { ...s, name: newName } } });
                                                }}
                                                className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-all"
                                                title="Editar"
                                            >
                                                <Icon name="edit-3" className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if (confirm(`¿Eliminar a ${s.name}?`)) {
                                                        dispatch({ type: 'DELETE_STUDENT', payload: { groupId: group.id, studentId: s.id } });
                                                    }
                                                }} 
                                                className="p-2 text-slate-400 hover:text-accent-red hover:bg-rose-50 rounded-lg transition-all"
                                                title="Eliminar"
                                            >
                                                <Icon name="trash-2" className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {group.students.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-16 text-center text-text-secondary">
                                            <Icon name="users" className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p className="font-medium italic">No hay alumnos registrados.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            <Modal isOpen={isGroupModalOpen} onClose={() => setGroupModalOpen(false)} title={editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'} size="xl">
                <GroupForm group={editingGroup} existingGroups={groups} onSave={(g) => { dispatch({ type: 'SAVE_GROUP', payload: g }); setGroupModalOpen(false); }} onCancel={() => setGroupModalOpen(false)} onImportCriteria={(id) => {}} />
            </Modal>

            <Modal isOpen={isStudentModalOpen} onClose={() => setStudentModalOpen(false)} title="Agregar Alumno">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const student: Student = {
                        id: uuidv4(),
                        name: formData.get('name') as string,
                        matricula: formData.get('matricula') as string,
                    };
                    if (student.name.trim()) {
                        dispatch({ type: 'SAVE_STUDENT', payload: { groupId: group!.id, student } });
                        setStudentModalOpen(false);
                    }
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Nombre</label>
                        <input name="name" required autoFocus className="w-full p-2.5 border border-border-color rounded-xl bg-surface focus:ring-2 focus:ring-primary" placeholder="Ej. Juan Pérez" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Matrícula</label>
                        <input name="matricula" className="w-full p-2.5 border border-border-color rounded-xl bg-surface focus:ring-2 focus:ring-primary" placeholder="Opcional" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setStudentModalOpen(false)}>Cancelar</Button>
                        <Button type="submit">Guardar</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isBulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Importar Alumnos" size="lg">
                <BulkStudentForm 
                    onAdd={(students) => { 
                        dispatch({ type: 'BULK_ADD_STUDENTS', payload: { groupId: group!.id, students } }); 
                        setBulkModalOpen(false); 
                    }} 
                    onCancel={() => setBulkModalOpen(false)} 
                />
            </Modal>

            <ConfirmationModal
                isOpen={!!confirmDeleteGroup}
                onClose={() => setConfirmDeleteGroup(null)}
                onConfirm={() => { dispatch({ type: 'DELETE_GROUP', payload: confirmDeleteGroup!.id }); setConfirmDeleteGroup(null); }}
                title="Eliminar Grupo"
                variant="danger"
                confirmText="Eliminar"
            >
                ¿Deseas eliminar permanentemente el grupo <strong>{confirmDeleteGroup?.name}</strong>?
            </ConfirmationModal>
        </div>
    );
};

export default GroupManagement;
