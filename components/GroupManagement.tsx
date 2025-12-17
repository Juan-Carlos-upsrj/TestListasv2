
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
        onTypesChange(types.map(type => 
            type.id === id 
                ? { ...type, [field]: field === 'weight' ? Number(value) : value } 
                : type
        ));
    };

    const addType = () => {
        onTypesChange([...types, { id: uuidv4(), name: '', weight: 0 }]);
    };
    
    const addAttendanceType = () => {
        // Check if attendance type already exists
        if (types.some(t => t.isAttendance)) {
            alert('Ya existe un criterio de asistencia para este parcial.');
            return;
        }
        onTypesChange([...types, { id: uuidv4(), name: 'Asistencia', weight: 0, isAttendance: true }]);
    };
    
    const removeType = (id: string) => {
        onTypesChange(types.filter(type => type.id !== id));
    };

    return (
        <fieldset className="border p-3 rounded-md border-border-color">
            <legend className="px-1 text-sm font-semibold">{partialName}</legend>
            <div className="space-y-2">
                {types.map(type => (
                    <div key={type.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-7 relative">
                             <input
                                type="text"
                                placeholder="Nombre (ej. Tareas)"
                                value={type.name}
                                onChange={e => handleTypeChange(type.id, 'name', e.target.value)}
                                disabled={type.isAttendance}
                                className={`w-full p-1.5 border border-border-color rounded-md bg-surface text-sm focus:ring-1 focus:ring-primary ${type.isAttendance ? 'pl-8 opacity-80' : ''}`}
                            />
                            {type.isAttendance && (
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-primary" title="Calculado automáticamente">
                                    <Icon name="users" className="w-4 h-4"/>
                                </div>
                            )}
                        </div>

                        <div className="col-span-4 relative">
                            <input
                                type="number"
                                placeholder="Peso"
                                value={type.weight}
                                onChange={e => handleTypeChange(type.id, 'weight', e.target.value)}
                                className="w-full p-1.5 border border-border-color rounded-md bg-surface text-sm focus:ring-1 focus:ring-primary"
                                min="0" max="100"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary text-sm">%</span>
                        </div>
                        <button type="button" onClick={() => removeType(type.id)} className="col-span-1 text-accent-red hover:bg-accent-red-light rounded-full p-1">
                            <Icon name="trash-2" className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap gap-2 justify-between items-center mt-3">
                 <div className="flex gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={addType} className="text-xs px-2 py-1">
                        <Icon name="plus" className="w-3 h-3"/> Tipo
                    </Button>
                     <Button type="button" size="sm" variant="secondary" onClick={addAttendanceType} disabled={types.some(t => t.isAttendance)} className="text-xs px-2 py-1">
                        <Icon name="users" className="w-3 h-3"/> Asistencia
                    </Button>
                 </div>
                <div className={`text-sm font-bold ${totalWeight !== 100 ? 'text-accent-red' : 'text-accent-green-dark'}`}>
                    Total: {totalWeight}%
                </div>
            </div>
        </fieldset>
    );
};


// Form for creating/editing a group
export const GroupForm: React.FC<{
    group?: Group;
    existingGroups?: Group[];
    onSave: (group: Group) => void;
    onCancel: () => void;
}> = ({ group, existingGroups = [], onSave, onCancel }) => {
    const [name, setName] = useState(group?.name || '');
    const [subject, setSubject] = useState(group?.subject || '');
    const [quarter, setQuarter] = useState(group?.quarter || '');
    const [classDays, setClassDays] = useState<DayOfWeek[]>(group?.classDays || []);
    const [color, setColor] = useState(group?.color || GROUP_COLORS[0].name);
    const [p1Types, setP1Types] = useState<EvaluationType[]>(group?.evaluationTypes?.partial1 || [{ id: uuidv4(), name: 'General', weight: 100 }]);
    const [p2Types, setP2Types] = useState<EvaluationType[]>(group?.evaluationTypes?.partial2 || [{ id: uuidv4(), name: 'General', weight: 100 }]);

    const handleDayToggle = (day: DayOfWeek) => {
        setClassDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleImportCriteria = (sourceGroupId: string) => {
        const sourceGroup = existingGroups.find(g => g.id === sourceGroupId);
        if (!sourceGroup) return;
        
        if (window.confirm(`¿Reemplazar los criterios actuales con los del grupo "${sourceGroup.name}"?`)) {
             const newP1 = sourceGroup.evaluationTypes.partial1.map(t => ({...t, id: uuidv4()}));
             const newP2 = sourceGroup.evaluationTypes.partial2.map(t => ({...t, id: uuidv4()}));
             setP1Types(newP1);
             setP2Types(newP2);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const p1Weight = p1Types.reduce((sum: number, t) => sum + Number(t.weight), 0);
        const p2Weight = p2Types.reduce((sum: number, t) => sum + Number(t.weight), 0);

        if (!name || !subject) {
            alert('Por favor, completa el nombre y la materia del grupo.');
            return;
        }
        if (p1Weight !== 100 || p2Weight !== 100) {
            alert('La suma de los pesos para cada parcial debe ser exactamente 100%.');
            return;
        }

        onSave({
            id: group?.id || uuidv4(),
            name,
            subject,
            quarter,
            classDays,
            students: group?.students || [],
            color,
            evaluationTypes: { partial1: p1Types, partial2: p2Types }
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                        <label htmlFor="groupName" className="block text-sm font-medium">Nombre del Grupo</label>
                        <input type="text" id="groupName" value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label htmlFor="quarter" className="block text-sm font-medium">Cuatrimestre (Opcional)</label>
                        <input type="text" id="quarter" placeholder="Ej. 5º, 10" value={quarter} onChange={e => setQuarter(e.target.value)} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary" />
                    </div>
                </div>
                <div>
                    <label htmlFor="subject" className="block text-sm font-medium">Materia</label>
                    <input type="text" id="subject" value={subject} onChange={e => setSubject(e.target.value)} required className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">Días de Clase</label>
                    <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map(day => (
                            <button
                                type="button"
                                key={day}
                                onClick={() => handleDayToggle(day)}
                                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                                    classDays.includes(day)
                                        ? 'bg-primary text-primary-text'
                                        : 'bg-surface-secondary hover:bg-border-color'
                                }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-2">Color del Grupo</label>
                    <div className="flex flex-wrap gap-3">
                        {GROUP_COLORS.map(c => (
                            <button
                                type="button"
                                key={c.name}
                                onClick={() => setColor(c.name)}
                                title={c.name}
                                className={`w-8 h-8 rounded-full ${c.bg} transition-transform transform hover:scale-110 focus:outline-none ${color === c.name ? 'ring-2 ring-offset-2 ring-primary ring-offset-surface' : ''}`}
                            />
                        ))}
                    </div>
                </div>
                 <div>
                    <div className="flex justify-between items-end mb-2">
                        <label className="block text-sm font-medium">Ponderación de Calificaciones</label>
                        {existingGroups.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-text-secondary">Copiar de:</span>
                                <select 
                                    className="text-xs p-1 border border-border-color rounded bg-surface focus:ring-1 focus:ring-primary max-w-[150px]"
                                    onChange={(e) => {
                                        if(e.target.value) {
                                            handleImportCriteria(e.target.value);
                                            e.target.value = ""; // Reset selection
                                        }
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Seleccionar...</option>
                                    {existingGroups.filter(g => g.id !== group?.id).map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <EvaluationTypesEditor types={p1Types} onTypesChange={setP1Types} partialName="Parcial 1" />
                        <EvaluationTypesEditor types={p2Types} onTypesChange={setP2Types} partialName="Parcial 2" />
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">{group ? 'Guardar Cambios' : 'Crear Grupo'}</Button>
            </div>
        </form>
    );
};

// Form for creating/editing a student
const StudentForm: React.FC<{
    student?: Student;
    onSave: (student: Student) => void;
    onCancel: () => void;
}> = ({ student, onSave, onCancel }) => {
    const [name, setName] = useState(student?.name || '');
    const [matricula, setMatricula] = useState(student?.matricula || '');
    const [nickname, setNickname] = useState(student?.nickname || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
             alert('El nombre es requerido.');
             return;
        }
        onSave({
            id: student?.id || uuidv4(),
            name,
            matricula,
            nickname
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="studentName" className="block text-sm font-medium">Nombre Completo</label>
                    <input type="text" id="studentName" value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                    <label htmlFor="matricula" className="block text-sm font-medium">Matrícula (Opcional)</label>
                    <input type="text" id="matricula" value={matricula} onChange={e => setMatricula(e.target.value)} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                    <label htmlFor="nickname" className="block text-sm font-medium">Apodo (Opcional)</label>
                    <input type="text" id="nickname" value={nickname} onChange={e => setNickname(e.target.value)} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary" />
                </div>
            </div>
             <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">{student ? 'Guardar Cambios' : 'Agregar Alumno'}</Button>
            </div>
        </form>
    );
};

// Form for bulk adding students
const BulkStudentForm: React.FC<{ onSave: (students: Student[]) => void; onCancel: () => void; }> = ({ onSave, onCancel }) => {
    const [studentData, setStudentData] = useState('');

    const performSave = () => {
        const lines = studentData.split('\n').filter(line => line.trim() !== '');
        const newStudents: Student[] = lines.map(line => {
            const parts = line.split(/[,;\t]/).map(p => p.trim());
            return {
                id: uuidv4(),
                name: parts[0] || '',
                matricula: parts[1] || '',
                nickname: parts[2] || '',
            };
        }).filter(s => s.name);
        
        if (newStudents.length > 0) {
            onSave(newStudents);
        } else {
            alert('No se encontraron alumnos válidos para agregar.');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        performSave();
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            performSave();
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <p className="mb-2 text-sm text-text-secondary">Pega la lista de alumnos. Separa el nombre, la matrícula y el apodo (opcional) con coma, punto y coma o tabulación. Un alumno por línea.</p>
            <textarea
                value={studentData}
                onChange={e => setStudentData(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={10}
                className="w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary"
                placeholder="Ejemplo:&#10;Juan Pérez, 12345, Juani&#10;Maria García; 67890"
            />
            <p className="text-xs text-text-secondary mt-2">Consejo: Presiona Ctrl+Enter (o ⌘+Enter en Mac) para agregar.</p>
             <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">Agregar Alumnos</Button>
            </div>
        </form>
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

    const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
    
    const filteredStudents = useMemo(() => {
      if (!selectedGroup) return [];
      if (!searchTerm.trim()) return selectedGroup.students;
      
      const search = searchTerm.toLowerCase();
      return selectedGroup.students.filter(student =>
        student.name.toLowerCase().includes(search) ||
        student.matricula?.toLowerCase().includes(search) ||
        student.nickname?.toLowerCase().includes(search)
      );
    }, [selectedGroup, searchTerm]);

    const handleSelectGroup = (groupId: string) => {
        dispatch({ type: 'SET_SELECTED_GROUP', payload: groupId });
    };

    // Group Handlers
    const handleSaveGroup = (group: Group) => {
        dispatch({ type: 'SAVE_GROUP', payload: group });
        dispatch({ type: 'ADD_TOAST', payload: { message: `Grupo '${group.name}' guardado.`, type: 'success' } });
        setGroupModalOpen(false);
        setEditingGroup(undefined);
        if(!selectedGroupId) {
            handleSelectGroup(group.id);
        }
    };

    const handleDuplicateGroup = (sourceGroup: Group) => {
        if (!window.confirm(`¿Crear una copia del grupo "${sourceGroup.name}" con todos sus alumnos?`)) return;
        
        const newGroup: Group = {
            ...sourceGroup,
            id: uuidv4(),
            name: `${sourceGroup.name} (Copia)`,
            // Deep copy students with new IDs to ensure they are distinct entities
            students: sourceGroup.students.map(s => ({...s, id: uuidv4()})),
            // Deep copy eval types with new IDs
            evaluationTypes: {
                partial1: sourceGroup.evaluationTypes.partial1.map(t => ({...t, id: uuidv4()})),
                partial2: sourceGroup.evaluationTypes.partial2.map(t => ({...t, id: uuidv4()}))
            }
        };
        dispatch({ type: 'SAVE_GROUP', payload: newGroup });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Grupo duplicado con éxito.', type: 'success' } });
    };

    const handleDeleteGroup = (groupId: string) => {
        if (window.confirm('¿Seguro que quieres eliminar este grupo? Se borrarán todos los datos asociados (alumnos, asistencia, calificaciones).')) {
            const groupName = groups.find(g => g.id === groupId)?.name;
            dispatch({ type: 'DELETE_GROUP', payload: groupId });
            dispatch({ type: 'ADD_TOAST', payload: { message: `Grupo '${groupName}' eliminado.`, type: 'error' } });
        }
    };

    // Student Handlers
    const handleSaveStudent = (student: Student) => {
        if (selectedGroupId) {
            dispatch({ type: 'SAVE_STUDENT', payload: { groupId: selectedGroupId, student } });
            dispatch({ type: 'ADD_TOAST', payload: { message: `Alumno '${student.name}' guardado.`, type: 'success' } });
            setStudentModalOpen(false);
            setEditingStudent(undefined);
        }
    };
    
    const handleBulkSaveStudents = (students: Student[]) => {
        if (selectedGroupId) {
            dispatch({ type: 'BULK_ADD_STUDENTS', payload: { groupId: selectedGroupId, students } });
            dispatch({ type: 'ADD_TOAST', payload: { message: `${students.length} alumnos agregados.`, type: 'success' } });
            setBulkModalOpen(false);
        }
    };

    const handleDeleteStudent = (studentId: string) => {
        if (selectedGroupId && window.confirm('¿Seguro que quieres eliminar a este alumno?')) {
            const studentName = selectedGroup?.students.find(s => s.id === studentId)?.name;
            dispatch({ type: 'DELETE_STUDENT', payload: { groupId: selectedGroupId, studentId } });
             dispatch({ type: 'ADD_TOAST', payload: { message: `Alumno '${studentName}' eliminado.`, type: 'error' } });
        }
    };
    
    return (
        <div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Groups List */}
                <div className="lg:col-span-1 bg-surface p-4 rounded-xl shadow-sm border border-border-color">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-text-primary">Mis Grupos</h2>
                        <Button size="sm" onClick={() => { setEditingGroup(undefined); setGroupModalOpen(true); }}>
                            <Icon name="plus" className="w-4 h-4" /> Nuevo
                        </Button>
                    </div>
                    {groups.length > 0 ? (
                        <ul className="space-y-2">
                           {groups.map(group => {
                                const groupColor = GROUP_COLORS.find(c => c.name === group.color) || GROUP_COLORS[0];
                                const isSelected = selectedGroupId === group.id;
                                return (
                                <li key={group.id} onClick={() => handleSelectGroup(group.id)}
                                    className={`p-3 rounded-lg cursor-pointer transition-all border-l-4 ${
                                        isSelected 
                                            ? `${groupColor.bg} ${groupColor.text} shadow-md border-transparent` 
                                            : 'bg-surface-secondary hover:bg-border-color border-transparent hover:border-l-gray-400'
                                    }`}
                                >
                                   <div className="flex justify-between items-start">
                                       <div className="flex items-start gap-3">
                                            <div>
                                               <div className="flex items-center gap-2">
                                                   <p className="font-semibold">{group.name}</p>
                                                   {group.quarter && (
                                                       <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-white text-text-secondary border border-border-color'}`}>
                                                           {group.quarter}
                                                       </span>
                                                   )}
                                               </div>
                                               <p className={`text-sm ${isSelected ? 'opacity-90' : 'text-text-secondary'}`}>{group.subject}</p>
                                           </div>
                                       </div>
                                       <div className="flex gap-2 items-center flex-shrink-0">
                                            <button onClick={(e) => { e.stopPropagation(); setEditingGroup(group); setGroupModalOpen(true); }} className={`p-1 ${isSelected ? 'hover:bg-white/20' : 'hover:text-primary'}`}><Icon name="edit-3" className="w-4 h-4"/></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDuplicateGroup(group); }} className={`p-1 ${isSelected ? 'hover:bg-white/20' : 'hover:text-primary'}`} title="Duplicar Grupo"><Icon name="copy" className="w-4 h-4"/></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }} className={`p-1 ${isSelected ? 'hover:bg-white/20' : 'hover:text-accent-red'}`}><Icon name="trash-2" className="w-4 h-4"/></button>
                                       </div>
                                   </div>
                               </li>
                               );
                            })}
                        </ul>
                    ) : (
                        <p className="text-center py-8 text-text-secondary">No has creado ningún grupo todavía.</p>
                    )}
                </div>

                {/* Students List */}
                <div className="lg:col-span-2 bg-surface p-4 rounded-xl shadow-sm border border-border-color">
                   {selectedGroup ? (
                        <div>
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                                <h2 className="text-2xl font-bold text-text-primary">
                                    {selectedGroup.name} 
                                    <span className="font-normal text-lg text-text-secondary">
                                      ({filteredStudents.length} de {selectedGroup.students.length} alumnos)
                                    </span>
                                </h2>
                                <div className="flex gap-2 flex-wrap items-center">
                                    <input
                                      type="text"
                                      value={searchTerm}
                                      onChange={(e) => setSearchTerm(e.target.value)}
                                      placeholder="Buscar alumno..."
                                      className="px-3 py-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary text-sm"
                                    />
                                    <Button size="sm" variant="secondary" onClick={() => setBulkModalOpen(true)}>
                                        <Icon name="list-plus" className="w-4 h-4"/> Agregar Varios
                                    </Button>
                                    <Button size="sm" onClick={() => { setEditingStudent(undefined); setStudentModalOpen(true); }}>
                                        <Icon name="user-plus" className="w-4 h-4"/> Nuevo Alumno
                                    </Button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-border-color">
                                            <th className="p-2">#</th>
                                            {settings.showMatricula && <th className="p-2">Matrícula</th>}
                                            <th className="p-2">Nombre</th>
                                            <th className="p-2 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence>
                                        {filteredStudents.map((student, index) => (
                                            <motion.tr
                                                key={student.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0, x: -50 }}
                                                className="border-b border-border-color/70 hover:bg-surface-secondary/40"
                                            >
                                                <td className="p-2 text-text-secondary">{index + 1}</td>
                                                {settings.showMatricula && <td className="p-2">{student.matricula || '-'}</td>}
                                                <td className="p-2 font-medium">{student.name} {student.nickname && <span className="font-normal text-text-secondary">({student.nickname})</span>}</td>
                                                <td className="p-2 text-right">
                                                    <div className="inline-flex gap-2">
                                                         <button onClick={() => { setEditingStudent(student); setStudentModalOpen(true); }} className="p-1 text-text-secondary hover:text-primary"><Icon name="edit-3" className="w-4 h-4"/></button>
                                                         <button onClick={() => handleDeleteStudent(student.id)} className="p-1 text-text-secondary hover:text-accent-red"><Icon name="trash-2" className="w-4 h-4"/></button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                                {selectedGroup.students.length === 0 && (
                                    <p className="text-center text-text-secondary py-8">No hay alumnos en este grupo.</p>
                                )}
                                {selectedGroup.students.length > 0 && filteredStudents.length === 0 && (
                                     <p className="text-center text-text-secondary py-8">No se encontraron alumnos con esa búsqueda.</p>
                                )}
                            </div>
                        </div>
                   ) : (
                       <div className="text-center py-20 flex flex-col items-center justify-center h-full">
                           <Icon name="users" className="w-20 h-20 mx-auto text-border-color"/>
                           <p className="mt-4 text-text-secondary">Selecciona un grupo para ver sus alumnos.</p>
                           {groups.length === 0 && <p className="mt-1 text-sm text-text-secondary/70">O crea un nuevo grupo para empezar.</p>}
                       </div>
                   )}
                </div>
            </div>

            <Modal isOpen={isGroupModalOpen} onClose={() => { setGroupModalOpen(false); setEditingGroup(undefined); }} title={editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'} size="xl">
                <GroupForm group={editingGroup} existingGroups={groups} onSave={handleSaveGroup} onCancel={() => { setGroupModalOpen(false); setEditingGroup(undefined); }} />
            </Modal>
            <Modal isOpen={isStudentModalOpen} onClose={() => { setStudentModalOpen(false); setEditingStudent(undefined); }} title={editingStudent ? 'Editar Alumno' : 'Nuevo Alumno'}>
                <StudentForm student={editingStudent} onSave={handleSaveStudent} onCancel={() => { setStudentModalOpen(false); setEditingStudent(undefined); }} />
            </Modal>
            <Modal isOpen={isBulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Agregar Alumnos en Lote">
                <BulkStudentForm onSave={handleBulkSaveStudents} onCancel={() => setBulkModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default GroupManagement;
