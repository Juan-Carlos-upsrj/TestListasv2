import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Group, DayOfWeek, EvaluationType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import ConfirmationModal from './common/ConfirmationModal';
import { DAYS_OF_WEEK, GROUP_COLORS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

// --- COMPONENTE: EDITOR DE CRITERIOS ---
const EvaluationTypesEditor: React.FC<{ 
    types: EvaluationType[]; 
    onTypesChange: (types: EvaluationType[]) => void; 
    partialName: string; 
}> = ({ types, onTypesChange, partialName }) => {
    const totalWeight = useMemo(() => types.reduce((sum, type) => sum + (Number(type.weight) || 0), 0), [types]);
    
    const handleTypeChange = (id: string, field: 'name' | 'weight', value: string) => {
        onTypesChange(types.map(type => 
            type.id === id ? { ...type, [field]: field === 'weight' ? Number(value) : value } : type
        ));
    };

    const addType = () => onTypesChange([...types, { id: uuidv4(), name: '', weight: 0 }]);
    const removeType = (id: string) => onTypesChange(types.filter(type => type.id !== id));

    return (
        <fieldset className="border-2 p-4 rounded-2xl border-slate-100 bg-slate-50/50">
            <legend className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{partialName}</legend>
            <div className="space-y-3 mt-2">
                {types.map(type => (
                    <div key={type.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-8">
                             <input 
                                type="text" 
                                placeholder="Ej. Examen" 
                                value={type.name} 
                                onChange={e => handleTypeChange(type.id, 'name', e.target.value)} 
                                className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                             />
                        </div>
                        <div className="col-span-3 relative">
                            <input 
                                type="number" 
                                value={type.weight} 
                                onChange={e => handleTypeChange(type.id, 'weight', e.target.value)} 
                                className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs font-black pr-6 text-center outline-none" 
                                min="0" 
                                max="100"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] font-bold">%</span>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => removeType(type.id)} 
                            className="col-span-1 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                            <Icon name="trash-2" className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200/60">
                <button 
                    type="button" 
                    onClick={addType} 
                    className="flex items-center gap-1.5 text-[10px] font-black text-primary hover:text-primary-hover uppercase tracking-wider transition-colors"
                >
                    <Icon name="plus" className="w-3 h-3"/> Añadir Criterio
                </button>
                <div className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${totalWeight !== 100 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    Suma: {totalWeight}%
                </div>
            </div>
        </fieldset>
    );
};

// --- COMPONENTE: FORMULARIO DE GRUPO ---
// FIX: Exported GroupForm so it can be imported as a named member in GradesView.tsx
export const GroupForm: React.FC<{ 
    group?: Group; 
    onSave: (group: Group) => void; 
    onCancel: () => void; 
}> = ({ group, onSave, onCancel }) => {
    const [name, setName] = useState(group?.name || '');
    const [subject, setSubject] = useState(group?.subject || '');
    const [subjectShortName, setSubjectShortName] = useState(group?.subjectShortName || '');
    const [quarter, setQuarter] = useState(group?.quarter || '');
    const [classDays, setClassDays] = useState<DayOfWeek[]>(group?.classDays || []);
    const [color, setColor] = useState(group?.color || GROUP_COLORS[0].name);
    
    const [p1Types, setP1Types] = useState<EvaluationType[]>(
        group?.evaluationTypes?.partial1 || [{ id: uuidv4(), name: 'General', weight: 100 }]
    );
    const [p2Types, setP2Types] = useState<EvaluationType[]>(
        group?.evaluationTypes?.partial2 || [{ id: uuidv4(), name: 'General', weight: 100 }]
    );

    const handleDayToggle = (day: DayOfWeek) => {
        setClassDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    };

    const isTotalValid = (types: EvaluationType[]) => 
        types.reduce((s, t) => s + (Number(t.weight) || 0), 0) === 100;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isTotalValid(p1Types)) return alert('La suma del P1 debe ser 100%');
        if (!isTotalValid(p2Types)) return alert('La suma del P2 debe ser 100%');
        
        onSave({ 
            id: group?.id || uuidv4(), 
            name: name.toUpperCase(), 
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
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* SECCIÓN IZQUIERDA: DATOS BÁSICOS */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Icon name="layout" className="w-5 h-5 text-primary" />
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Información General</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Nombre Grupo</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. 6A" required className="w-full p-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary font-bold uppercase transition-all outline-none"/>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Cuatrimestre</label>
                            <input type="text" value={quarter} onChange={e => setQuarter(e.target.value)} placeholder="Ej. 5º" className="w-full p-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary font-bold text-center transition-all outline-none"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Materia Completa</label>
                        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ej. Introducción a la Programación" required className="w-full p-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary font-bold transition-all outline-none"/>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Abrev. (3-5 letras)</label>
                        <input type="text" value={subjectShortName} onChange={e => setSubjectShortName(e.target.value)} maxLength={5} placeholder="Ej. PROG" className="w-full p-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary font-black uppercase text-center transition-all outline-none"/>
                    </div>
                </div>

                {/* SECCIÓN DERECHA: CONFIGURACIÓN VISUAL Y DÍAS */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Icon name="calendar" className="w-5 h-5 text-primary" />
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Días de Clase</h4>
                    </div>
                    <div className="flex flex-wrap gap-2 py-2">
                        {DAYS_OF_WEEK.map(day => (
                            <button 
                                type="button" 
                                key={day} 
                                onClick={() => handleDayToggle(day)} 
                                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border-2 ${classDays.includes(day) ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                                {day.substring(0, 3).toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2 pt-2">
                        <Icon name="settings" className="w-5 h-5 text-primary" />
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Identificador Visual</h4>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {GROUP_COLORS.map(c => (
                            <button 
                                type="button" 
                                key={c.name} 
                                onClick={() => setColor(c.name)} 
                                className={`w-9 h-9 rounded-2xl ${c.bg} transition-all hover:scale-110 shadow-sm ${color === c.name ? 'ring-4 ring-offset-2 ring-primary/30 scale-110' : 'opacity-60 hover:opacity-100'}`}
                                title={c.name}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* SECCIÓN INFERIOR: ESQUEMA DE EVALUACIÓN */}
            <div className="space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Icon name="bar-chart-3" className="w-5 h-5 text-primary" />
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Esquema de Evaluación (Ponderación)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <EvaluationTypesEditor types={p1Types} onTypesChange={setP1Types} partialName="Primer Parcial" />
                    <EvaluationTypesEditor types={p2Types} onTypesChange={setP2Types} partialName="Segundo Parcial" />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={onCancel} className="!rounded-2xl">Cancelar</Button>
                <Button 
                    type="submit" 
                    className="shadow-xl shadow-primary/20 !rounded-2xl px-8"
                    disabled={!isTotalValid(p1Types) || !isTotalValid(p2Types)}
                >
                    <Icon name="check-circle-2" className="w-5 h-5" /> 
                    {group ? 'Guardar Cambios' : 'Crear Grupo'}
                </Button>
            </div>
        </form>
    );
};

// --- COMPONENTE PRINCIPAL ---
const GroupManagement: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, selectedGroupId } = state;
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);
    const [confirmDelete, setConfirmDelete] = useState<Group | null>(null);

    const handleSaveGroup = (g: Group) => {
        dispatch({ type: 'SAVE_GROUP', payload: g });
        setIsModalOpen(false);
        dispatch({ type: 'ADD_TOAST', payload: { 
            message: `Grupo ${g.name} ${editingGroup ? 'actualizado' : 'registrado'} con éxito.`, 
            type: 'success' 
        }});
    };

    const handleDelete = () => {
        if (confirmDelete) {
            dispatch({ type: 'DELETE_GROUP', payload: confirmDelete.id });
            setConfirmDelete(null);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Grupo eliminado permanentemente.', type: 'info' } });
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* CABECERA DE SECCIÓN */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/60 shadow-2xl shadow-slate-200/40">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary text-white rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-primary/30">
                        <Icon name="users" className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none">Gestión Académica</h2>
                        <p className="text-[11px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em]">{groups.length} Grupos Configurados</p>
                    </div>
                </div>
                <Button 
                    onClick={() => { setEditingGroup(undefined); setIsModalOpen(true); }} 
                    className="w-full sm:w-auto !rounded-2xl !py-4 !px-8 shadow-2xl shadow-primary/40 hover:-translate-y-1 transition-transform"
                >
                    <Icon name="plus" className="w-5 h-5" /> Nuevo Grupo
                </Button>
            </div>

            {/* GRID DE GRUPOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                    {groups.map((g, idx) => {
                        const colorObj = GROUP_COLORS.find(c => c.name === g.color) || GROUP_COLORS[0];
                        const isSelected = selectedGroupId === g.id;
                        
                        return (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: idx * 0.05 }}
                                key={g.id} 
                                onClick={() => dispatch({ type: 'SET_SELECTED_GROUP', payload: g.id })} 
                                className={`group relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-500 overflow-hidden ${
                                    isSelected 
                                    ? 'border-primary bg-primary/5 shadow-2xl scale-[1.03] z-10' 
                                    : 'border-white bg-white/80 hover:border-slate-200 hover:bg-white hover:shadow-xl'
                                }`}
                            >
                                {/* Fondo decorativo con el color del grupo */}
                                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${colorObj.bg}`} />

                                <div className="flex justify-between items-start mb-5 relative">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorObj.bg} ${colorObj.text} shadow-lg transition-transform group-hover:rotate-6 group-hover:scale-110`}>
                                        <span className="font-black text-lg">{g.name.substring(0, 2)}</span>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setEditingGroup(g); setIsModalOpen(true); }} 
                                            className="p-2.5 bg-slate-100 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                            title="Editar Grupo"
                                        >
                                            <Icon name="edit-3" className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(g); }} 
                                            className="p-2.5 bg-slate-100 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                            title="Eliminar Grupo"
                                        >
                                            <Icon name="trash-2" className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative">
                                    <h3 className="font-black text-xl truncate uppercase text-slate-800 leading-tight mb-1">{g.name}</h3>
                                    <p className="text-[11px] text-slate-500 font-bold truncate uppercase tracking-wide mb-4 opacity-80">{g.subject}</p>
                                    
                                    <div className="flex flex-wrap gap-1.5 mb-6 min-h-[24px]">
                                        {['L', 'M', 'X', 'J', 'V', 'S'].map(d => {
                                            const dayName = DAYS_OF_WEEK.find(dw => dw.startsWith(d === 'X' ? 'Mi' : d === 'L' ? 'Lu' : d === 'M' ? 'Ma' : d === 'J' ? 'Ju' : d === 'V' ? 'Vi' : 'Sá'));
                                            const isActive = g.classDays.includes(dayName as DayOfWeek);
                                            return (
                                                <span 
                                                    key={d} 
                                                    className={`text-[9px] font-black w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-50 text-slate-300'}`}
                                                >
                                                    {d}
                                                </span>
                                            );
                                        })}
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Alumnos</span>
                                            <span className="text-sm font-black text-slate-700">{g.students.length}</span>
                                        </div>
                                        <div className="bg-slate-900 text-white px-3 py-1 rounded-xl shadow-md transform group-hover:scale-110 transition-transform">
                                            <span className="text-[10px] font-black uppercase tracking-tighter">{g.quarter || 'S/Q'}</span>
                                        </div>
                                    </div>
                                </div>

                                {isSelected && (
                                    <motion.div 
                                        layoutId="active-border"
                                        className="absolute inset-0 border-2 border-primary rounded-[2rem] pointer-events-none"
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* ESTADO VACÍO */}
                {groups.length === 0 && (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white/40 rounded-[3rem] border-4 border-dashed border-white/60">
                        <div className="w-24 h-24 bg-slate-200 text-slate-400 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
                            <Icon name="users" className="w-12 h-12" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-400 uppercase tracking-[0.2em]">Sin Grupos Activos</h3>
                        <p className="text-sm text-slate-500 font-medium mt-3 opacity-60">Tu trayectoria académica comienza registrando tu primer grupo.</p>
                        <Button onClick={() => setIsModalOpen(true)} className="mt-10 !rounded-2xl px-10">Comenzar Ahora</Button>
                    </div>
                )}
            </div>

            {/* MODAL DE EDICIÓN/CREACIÓN */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={editingGroup ? 'Configuración de Grupo' : 'Registro de Nuevo Grupo'} 
                size="2xl"
            >
                <GroupForm 
                    group={editingGroup} 
                    onSave={handleSaveGroup} 
                    onCancel={() => setIsModalOpen(false)} 
                />
            </Modal>

            {/* MODAL DE ELIMINACIÓN */}
            <ConfirmationModal 
                isOpen={!!confirmDelete} 
                onClose={() => setConfirmDelete(null)} 
                onConfirm={handleDelete} 
                title="Baja de Grupo" 
                variant="danger"
                confirmText="Confirmar Baja"
            >
                <div className="space-y-4">
                    <p className="text-sm leading-relaxed">
                        ¿Estás seguro de que deseas eliminar el grupo <strong className="text-rose-600">{confirmDelete?.name}</strong>?
                    </p>
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-[11px] text-rose-700 font-medium italic">
                        "Esta acción borrará permanentemente toda la lista de alumnos, asistencias y calificaciones registradas. Esta operación es irreversible."
                    </div>
                </div>
            </ConfirmationModal>
        </div>
    );
};

export default GroupManagement;