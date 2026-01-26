
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

// --- SUBCOMPONENTE: FORMULARIO DE ALUMNO (ESTILO FICHA 1.5.0+) ---
const StudentForm: React.FC<{
    student?: Student;
    onSave: (data: Partial<Student>) => void;
    onCancel: () => void;
}> = ({ student, onSave, onCancel }) => {
    const [name, setName] = useState(student?.name || '');
    const [matricula, setMatricula] = useState(student?.matricula || '');
    const [nickname, setNickname] = useState(student?.nickname || '');
    const [isRepeating, setIsRepeating] = useState(student?.isRepeating || false);
    const [team, setTeam] = useState(student?.team || '');
    const [teamCoyote, setTeamCoyote] = useState(student?.teamCoyote || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave({ 
                name: name.trim().toUpperCase(), 
                matricula: matricula.trim().toUpperCase(),
                nickname: nickname.trim(),
                isRepeating,
                team: team.trim() || undefined,
                teamCoyote: teamCoyote.trim() || undefined
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Icon name="users" className="w-5 h-5 text-primary" />
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Información de Identidad</h4>
                </div>
                
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Nombre Completo</label>
                    <input 
                        autoFocus
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="Ej. BALLIN TOVAR DANIELA YARETH"
                        className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary transition-all text-sm font-bold"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Apodo / Nickname</label>
                        <div className="relative">
                            <Icon name="edit-3" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                value={nickname} 
                                onChange={e => setNickname(e.target.value)} 
                                placeholder="Como le gusta que le digan"
                                className="w-full pl-10 pr-3 py-2.5 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary transition-all text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Matrícula</label>
                        <div className="relative">
                            <Icon name="graduation-cap" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                value={matricula} 
                                onChange={e => setMatricula(e.target.value)} 
                                placeholder="ID del sistema"
                                className="w-full pl-10 pr-3 py-2.5 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary transition-all text-sm font-mono"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Icon name="book-marked" className="w-5 h-5 text-indigo-500" />
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Estatus Académico</h4>
                </div>

                <div 
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${isRepeating ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                    onClick={() => setIsRepeating(!isRepeating)}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isRepeating ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            <Icon name="info" className="w-5 h-5" />
                        </div>
                        <div>
                            <p className={`text-sm font-black ${isRepeating ? 'text-rose-700' : 'text-slate-700'}`}>Alumno en Recursamiento</p>
                            <p className="text-[10px] text-slate-500">¿Está repitiendo la materia?</p>
                        </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${isRepeating ? 'bg-rose-600' : 'bg-slate-300'}`}>
                        <motion.div 
                            animate={{ x: isRepeating ? 24 : 4 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Equipo Base</label>
                        <input 
                            type="text" 
                            value={team} 
                            onChange={e => setTeam(e.target.value)} 
                            placeholder="Nombre del equipo"
                            className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold text-indigo-700"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Equipo Coyote</label>
                        <input 
                            type="text" 
                            value={teamCoyote} 
                            onChange={e => setTeamCoyote(e.target.value)} 
                            placeholder="Asignación coyote"
                            className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all text-sm font-bold text-orange-700"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" type="button" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" className="shadow-lg shadow-primary/20">
                    <Icon name="check-circle-2" className="w-4 h-4" /> 
                    {student ? 'Actualizar Ficha' : 'Agregar Alumno'}
                </Button>
            </div>
        </form>
    );
};

// --- SUBCOMPONENTES DE APOYO ---
export const EvaluationTypesEditor: React.FC<{ types: EvaluationType[]; onTypesChange: (types: EvaluationType[]) => void; partialName: string; }> = ({ types, onTypesChange, partialName }) => {
    const totalWeight = useMemo(() => types.reduce((sum, type) => sum + (Number(type.weight) || 0), 0), [types]);
    const handleTypeChange = (id: string, field: 'name' | 'weight', value: string) => onTypesChange(types.map(type => type.id === id ? { ...type, [field]: field === 'weight' ? Number(value) : value } : type));
    const addType = () => onTypesChange([...types, { id: uuidv4(), name: '', weight: 0 }]);
    const addAttendanceType = () => !types.some(t => t.isAttendance) && onTypesChange([...types, { id: uuidv4(), name: 'Asistencia', weight: 0, isAttendance: true }]);
    const removeType = (id: string) => onTypesChange(types.filter(type => type.id !== id));

    return (
        <fieldset className="border p-3 rounded-xl border-border-color bg-slate-50/50">
            <legend className="px-2 text-xs font-black uppercase text-slate-400 tracking-widest">{partialName}</legend>
            <div className="space-y-2 mt-1">
                {types.map(type => (
                    <div key={type.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-7 relative">
                             <input type="text" placeholder="Nombre" value={type.name} onChange={e => handleTypeChange(type.id, 'name', e.target.value)} disabled={type.isAttendance} className={`w-full p-1.5 border border-slate-200 rounded-lg bg-white text-sm ${type.isAttendance ? 'pl-8 font-bold text-primary' : ''}`}/>
                            {type.isAttendance && <div className="absolute left-2 top-1/2 -translate-y-1/2 text-primary"><Icon name="users" className="w-4 h-4"/></div>}
                        </div>
                        <div className="col-span-4 relative">
                            <input type="number" value={type.weight} onChange={e => handleTypeChange(type.id, 'weight', e.target.value)} className="w-full p-1.5 border border-slate-200 rounded-lg bg-white text-sm pr-6" min="0" max="100"/>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">%</span>
                        </div>
                        <button type="button" onClick={() => removeType(type.id)} className="col-span-1 text-rose-400 hover:text-rose-600 transition-colors"><Icon name="trash-2" className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200">
                 <div className="flex gap-2">
                    <button type="button" onClick={addType} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm"><Icon name="plus" className="w-3.5 h-3.5"/></button>
                    <button type="button" onClick={addAttendanceType} disabled={types.some(t => t.isAttendance)} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-emerald-600 disabled:opacity-30 shadow-sm"><Icon name="users" className="w-3.5 h-3.5"/></button>
                 </div>
                <div className={`text-[10px] font-black uppercase ${totalWeight !== 100 ? 'text-rose-500' : 'text-emerald-600'}`}>Suma: {totalWeight}%</div>
            </div>
        </fieldset>
    );
};

export const BulkStudentForm: React.FC<{ onAdd: (students: Student[]) => void; onCancel: () => void; }> = ({ onAdd, onCancel }) => {
    const [text, setText] = useState('');
    const handleAdd = () => {
        const students: Student[] = text.split('\n').filter(l => l.trim()).map(line => {
            const parts = line.split('\t');
            if (parts.length === 1) {
                const commaParts = line.split(',');
                if (commaParts.length > 1) return { id: uuidv4(), name: commaParts[0].trim().toUpperCase(), matricula: commaParts[1].trim() };
            }
            return { id: uuidv4(), name: (parts[0] || 'Alumno').trim().toUpperCase(), matricula: (parts[1] || '').trim() };
        });
        onAdd(students);
    };
    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-500">Pega tu lista (Formato: Nombre [Tab/Coma] Matrícula).</p>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="JUAN PEREZ	2023001" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 h-48 font-mono text-xs focus:ring-2 focus:ring-primary"/>
            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                <Button onClick={handleAdd} disabled={!text.trim()}><Icon name="list-plus" className="w-4 h-4" /> Importar</Button>
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
    const handleCopyCriteria = (id: string) => {
        const src = existingGroups.find(g => g.id === id);
        if (src) {
            setP1Types(src.evaluationTypes.partial1.map(t => ({ ...t, id: uuidv4() })));
            setP2Types(src.evaluationTypes.partial2.map(t => ({ ...t, id: uuidv4() })));
        }
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (p1Types.reduce((s, t) => s + Number(t.weight), 0) !== 100 || p2Types.reduce((s, t) => s + Number(t.weight), 0) !== 100) { alert('La suma debe ser 100%'); return; }
        const gid = group?.id || uuidv4();
        dispatch({ type: 'SET_GROUP_TUTOR', payload: { groupId: gid, tutorName: tutorName.trim() } });
        onSave({ id: gid, name, subject, subjectShortName: subjectShortName.trim().toUpperCase() || undefined, quarter, classDays, students: group?.students || [], color, evaluationTypes: { partial1: p1Types, partial2: p2Types } });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-bold mb-1">Nombre Grupo (Ej. 6A)</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-primary"/></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-bold mb-1">Cuatrimestre</label><input type="text" placeholder="Ej. 6º" value={quarter} onChange={e => setQuarter(e.target.value)} className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-primary"/></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-bold mb-1">Materia Completa</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} required className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-primary"/></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-bold mb-1">Abreviatura (MAT)</label><input type="text" value={subjectShortName} onChange={e => setSubjectShortName(e.target.value)} maxLength={8} className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-primary font-bold uppercase"/></div>
            </div>
            <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-3">
                <Icon name="graduation-cap" className="w-5 h-5 text-indigo-600" />
                <div className="flex-1">
                    <label className="block text-[10px] font-black uppercase text-indigo-400 mb-0.5">Tutor Responsable</label>
                    <input type="text" value={tutorName} onChange={e => setTutorName(e.target.value)} placeholder="Nombre del Profesor" className="w-full bg-transparent border-none p-0 text-sm font-bold text-indigo-700 focus:ring-0"/>
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold mb-2">Días de Clase</label>
                <div className="flex flex-wrap gap-1.5">{DAYS_OF_WEEK.map(day => (<button type="button" key={day} onClick={() => handleDayToggle(day)} className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${classDays.includes(day) ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{day}</button>))}</div>
            </div>
            <div>
                <label className="block text-xs font-bold mb-2">Color del Grupo</label>
                <div className="flex flex-wrap gap-2.5">
                    {GROUP_COLORS.map(c => (
                        <button 
                            type="button" 
                            key={c.name} 
                            onClick={() => setColor(c.name)} 
                            className={`w-7 h-7 rounded-full ${c.bg} transition-transform hover:scale-110 ${color === c.name ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                        />
                    ))}
                </div>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2"><label className="text-sm font-black uppercase text-slate-800 tracking-tight">Criterios de Evaluación</label>{existingGroups.length > 1 && <select className="text-[10px] p-1 border border-slate-200 rounded-lg bg-white font-bold" onChange={e => { if(e.target.value) { handleCopyCriteria(e.target.value); e.target.value = ""; } }} defaultValue=""><option value="" disabled>Copiar de...</option>{existingGroups.filter(g => g.id !== group?.id).map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}</select>}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><EvaluationTypesEditor types={p1Types} onTypesChange={setP1Types} partialName="Parcial 1" /><EvaluationTypesEditor types={p2Types} onTypesChange={setP2Types} partialName="Parcial 2" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit">{group ? 'Guardar Cambios' : 'Crear Grupo'}</Button></div>
        </form>
    );
};

// --- COMPONENTE PRINCIPAL: GESTIÓN DE GRUPOS ---
const GroupManagement: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, selectedGroupId } = state;
    
    const [isGroupModalOpen, setGroupModalOpen] = useState(false);
    const [isStudentModalOpen, setStudentModalOpen] = useState(false);
    const [isBulkModalOpen, setBulkModalOpen] = useState(false);
    
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [confirmDeleteStudent, setConfirmDeleteStudent] = useState<Student | null>(null);
    const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);
    const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<Group | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const group = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
    
    const filteredStudents = useMemo(() => {
        if (!group) return [];
        const term = searchTerm.toLowerCase();
        return group.students.filter(s => 
            s.name.toLowerCase().includes(term) || 
            (s.matricula && s.matricula.toLowerCase().includes(term)) ||
            (s.nickname && s.nickname.toLowerCase().includes(term))
        );
    }, [group, searchTerm]);

    const handleSaveStudentAction = (data: Partial<Student>) => {
        if (!group) return;
        const studentToSave: Student = editingStudent 
            ? { ...editingStudent, ...data }
            : { id: uuidv4(), name: '', matricula: '', ...data } as Student;
        dispatch({ type: 'SAVE_STUDENT', payload: { groupId: group.id, student: studentToSave } });
        setStudentModalOpen(false);
        setEditingStudent(null);
        dispatch({ type: 'ADD_TOAST', payload: { message: editingStudent ? 'Ficha actualizada.' : 'Alumno registrado.', type: 'success' } });
    };

    const handleDeleteStudentAction = () => {
        if (group && confirmDeleteStudent) {
            dispatch({ type: 'DELETE_STUDENT', payload: { groupId: group.id, studentId: confirmDeleteStudent.id } });
            setConfirmDeleteStudent(null);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Alumno eliminado.', type: 'info' } });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-border-color shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><Icon name="users" className="w-5 h-5" /></div>
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gestión de Grupos</h2>
                </div>
                <Button onClick={() => { setEditingGroup(undefined); setGroupModalOpen(true); }} size="sm" className="!py-2">
                    <Icon name="plus" className="w-4 h-4" /> Nuevo Grupo
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {groups.map(g => {
                    const colorObj = GROUP_COLORS.find(c => c.name === g.color) || GROUP_COLORS[0];
                    const isSelected = selectedGroupId === g.id;
                    return (
                        <motion.div 
                            layout
                            key={g.id} 
                            onClick={() => dispatch({ type: 'SET_SELECTED_GROUP', payload: g.id })} 
                            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-md scale-[1.01]' : 'border-slate-100 bg-surface hover:border-slate-200'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colorObj.bg} ${colorObj.text} shadow-sm`}><Icon name="users" className="w-4 h-4" /></div>
                                <div className="flex gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingGroup(g); setGroupModalOpen(true); }} className="p-1 hover:bg-white rounded-lg text-slate-400 hover:text-primary transition-all"><Icon name="edit-3" className="w-3.5 h-3.5" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteGroup(g); }} className="p-1 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition-all"><Icon name="trash-2" className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                            <h3 className="font-black text-sm truncate uppercase text-slate-800 leading-tight">{g.name}</h3>
                            <p className="text-[10px] text-slate-500 font-bold truncate uppercase">{g.subject}</p>
                            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-[9px] font-black uppercase text-slate-400">
                                <span className="flex items-center gap-1"><Icon name="users" className="w-2.5 h-2.5"/> {g.students.length} ALUMNOS</span>
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-600">{g.quarter || 'N/A'}</span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {group ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface rounded-3xl border border-border-color shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border-color bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary border border-slate-100"><Icon name="list-checks" className="w-5 h-5"/></div>
                            <div>
                                <h3 className="font-black text-lg text-slate-800 uppercase leading-none">{group.name}</h3>
                                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">{group.subject}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" placeholder="Filtro rápido..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-all"/>
                            </div>
                            <Button variant="secondary" onClick={() => setBulkModalOpen(true)} title="Importar Lista" className="!p-2"><Icon name="list-plus" className="w-4 h-4" /></Button>
                            <Button onClick={() => { setEditingStudent(null); setStudentModalOpen(true); }} title="Agregar Individual" className="!p-2"><Icon name="user-plus" className="w-4 h-4" /></Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100/50 text-slate-400 uppercase text-[10px] font-black sticky top-0 z-10 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 w-12 text-center">#</th>
                                    <th className="p-3">Alumno</th>
                                    <th className="p-3">Matrícula</th>
                                    <th className="p-3 text-center">Estatus Especial</th>
                                    <th className="p-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <AnimatePresence>
                                    {filteredStudents.map((s, idx) => (
                                        <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-3 text-slate-300 font-black text-center">{idx + 1}</td>
                                            <td className="p-3">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-700 uppercase tracking-tight">{s.name}</span>
                                                    {s.nickname && <span className="text-[10px] text-primary italic font-bold tracking-tight">"{s.nickname}"</span>}
                                                </div>
                                            </td>
                                            <td className="p-3 font-mono text-xs text-slate-500 font-bold">{s.matricula || 'SIN ID'}</td>
                                            <td className="p-3">
                                                <div className="flex flex-wrap gap-1.5 justify-center">
                                                    {s.isRepeating && <span className="text-[9px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full uppercase shadow-sm">Recu</span>}
                                                    {s.team && <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase border border-indigo-200">B: {s.team}</span>}
                                                    {s.teamCoyote && <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase border border-orange-200">C: {s.teamCoyote}</span>}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => { setEditingStudent(s); setStudentModalOpen(true); }} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all" title="Editar Ficha"><Icon name="edit-3" className="w-4 h-4" /></button>
                                                    <button onClick={() => setConfirmDeleteStudent(s)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Eliminar"><Icon name="trash-2" className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center">
                                            <div className="flex flex-col items-center opacity-30">
                                                <Icon name="users" className="w-16 h-16 mb-4"/>
                                                <p className="font-black uppercase tracking-widest text-xs">Sin alumnos registrados</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            ) : (
                <div className="flex flex-col items-center justify-center p-16 bg-surface rounded-3xl border border-dashed border-slate-200 opacity-50">
                    <Icon name="layout" className="w-16 h-16 mb-4 text-slate-300"/>
                    <p className="font-black uppercase text-slate-400 tracking-[0.2em] text-xs">Selecciona un grupo para gestionar</p>
                </div>
            )}

            {/* MODALES DE GRUPO */}
            <Modal isOpen={isGroupModalOpen} onClose={() => setGroupModalOpen(false)} title={editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'} size="xl">
                <GroupForm group={editingGroup} existingGroups={groups} onSave={(g) => { dispatch({ type: 'SAVE_GROUP', payload: g }); setGroupModalOpen(false); }} onCancel={() => setGroupModalOpen(false)} />
            </Modal>

            <ConfirmationModal isOpen={!!confirmDeleteGroup} onClose={() => setConfirmDeleteGroup(null)} onConfirm={() => { dispatch({ type: 'DELETE_GROUP', payload: confirmDeleteGroup!.id }); setConfirmDeleteGroup(null); }} title="Eliminar Grupo" variant="danger">
                ¿Deseas eliminar permanentemente el grupo <strong>{confirmDeleteGroup?.name}</strong>?
            </ConfirmationModal>

            {/* MODALES DE ALUMNO (BONITOS) */}
            <Modal isOpen={isStudentModalOpen} onClose={() => { setStudentModalOpen(false); setEditingStudent(null); }} title={editingStudent ? 'Ficha de Alumno' : 'Nuevo Registro'} size="lg">
                <StudentForm student={editingStudent || undefined} onSave={handleSaveStudentAction} onCancel={() => { setStudentModalOpen(false); setEditingStudent(null); }} />
            </Modal>

            <ConfirmationModal 
                isOpen={!!confirmDeleteStudent} 
                onClose={() => setConfirmDeleteStudent(null)} 
                onConfirm={handleDeleteStudentAction} 
                title="Eliminar Alumno" 
                variant="danger"
                confirmText="Confirmar Baja"
            >
                ¿Estás seguro de dar de baja a <strong>{confirmDeleteStudent?.name}</strong>? 
                <p className="mt-2 text-xs text-slate-400 italic">Se perderán sus asistencias y calificaciones de este grupo.</p>
            </ConfirmationModal>

            {/* IMPORTACIÓN MASIVA */}
            <Modal isOpen={isBulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Importar Lista de Excel" size="lg">
                <BulkStudentForm onAdd={(s) => { dispatch({ type: 'BULK_ADD_STUDENTS', payload: { groupId: group!.id, students: s } }); setBulkModalOpen(false); }} onCancel={() => setBulkModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default GroupManagement;
