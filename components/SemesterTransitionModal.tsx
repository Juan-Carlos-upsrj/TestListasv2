
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import { getNextQuarter, generateArchiveName, shouldGraduate } from '../services/transitionUtils';
import { Group } from '../types';

interface SemesterTransitionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ActionType = 'promote' | 'retain' | 'delete';

interface GroupAction {
    id: string;
    action: ActionType;
    nextQuarter: string;
}

const SemesterTransitionModal: React.FC<SemesterTransitionModalProps> = ({ isOpen, onClose }) => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, settings } = state;
    const [step, setStep] = useState(1);
    const [groupActions, setGroupActions] = useState<GroupAction[]>([]);
    const [archiveName, setArchiveName] = useState('');
    const [newSemesterStart, setNewSemesterStart] = useState('');
    const [newFirstPartialEnd, setNewFirstPartialEnd] = useState('');
    const [newSemesterEnd, setNewSemesterEnd] = useState('');

    // Initialize state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setArchiveName(generateArchiveName(settings.semesterStart, settings.semesterEnd));
            
            // Default next semester dates (guess: +4 months)
            const end = new Date(settings.semesterEnd);
            const nextStart = new Date(end);
            nextStart.setDate(end.getDate() + 7); // 1 week break
            
            const nextPartial = new Date(nextStart);
            nextPartial.setMonth(nextStart.getMonth() + 2);
            
            const nextEnd = new Date(nextStart);
            nextEnd.setMonth(nextStart.getMonth() + 4);
            
            setNewSemesterStart(nextStart.toISOString().split('T')[0]);
            setNewFirstPartialEnd(nextPartial.toISOString().split('T')[0]);
            setNewSemesterEnd(nextEnd.toISOString().split('T')[0]);

            // Initial group actions logic
            setGroupActions(groups.map(g => {
                const nextQ = getNextQuarter(g.quarter || '');
                const isGraduating = shouldGraduate(g.quarter || '');
                return {
                    id: g.id,
                    action: isGraduating ? 'delete' : 'promote',
                    nextQuarter: nextQ
                };
            }));
        }
    }, [isOpen, settings, groups]);

    const handleActionChange = (id: string, action: ActionType) => {
        setGroupActions(prev => prev.map(ga => ga.id === id ? { ...ga, action } : ga));
    };

    const handleQuarterChange = (id: string, val: string) => {
        setGroupActions(prev => prev.map(ga => ga.id === id ? { ...ga, nextQuarter: val } : ga));
    };

    const executeTransition = () => {
        // 1. Archive
        dispatch({ type: 'ARCHIVE_CURRENT_STATE', payload: archiveName });
        
        // 2. Process Groups
        const newGroups: Group[] = [];
        groups.forEach(g => {
            const action = groupActions.find(ga => ga.id === g.id);
            if (!action) return;

            if (action.action !== 'delete') {
                newGroups.push({
                    ...g,
                    quarter: action.nextQuarter, // Update quarter
                    // Retain students, color, subject, evaluation TYPES
                    // But evaluations (instances) and grades/attendance are wiped by the reducer
                });
            }
        });

        // 3. Transition
        dispatch({
            type: 'TRANSITION_SEMESTER',
            payload: {
                newGroups,
                newSettings: {
                    semesterStart: newSemesterStart,
                    firstPartialEnd: newFirstPartialEnd,
                    semesterEnd: newSemesterEnd
                }
            }
        });

        dispatch({ type: 'ADD_TOAST', payload: { message: 'Ciclo cerrado correctamente. Bienvenido al nuevo semestre.', type: 'success' } });
        onClose();
    };

    const renderStep1 = () => (
        <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                    <Icon name="download-cloud" className="w-5 h-5"/> Paso 1: Respaldo Automático
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    Antes de borrar cualquier dato, guardaremos una copia exacta de tu estado actual (asistencia, calificaciones, grupos) en el historial. Podrás consultarlo cuando quieras en modo "Solo Lectura".
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Nombre del Respaldo</label>
                <input 
                    type="text" 
                    value={archiveName} 
                    onChange={e => setArchiveName(e.target.value)}
                    className="w-full p-2 border border-border-color rounded-md bg-surface"
                />
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4">
            <h3 className="font-bold text-lg mb-2">Paso 2: Transición de Grupos</h3>
            <p className="text-sm text-text-secondary mb-4">
                Decide qué pasará con tus grupos actuales. Puedes pasarlos al siguiente cuatrimestre, repetirlos o eliminarlos (si se gradúan).
            </p>
            <div className="max-h-[40vh] overflow-y-auto border border-border-color rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-surface-secondary sticky top-0">
                        <tr>
                            <th className="p-2 border-b border-border-color">Grupo</th>
                            <th className="p-2 border-b border-border-color">Actual</th>
                            <th className="p-2 border-b border-border-color">Acción</th>
                            <th className="p-2 border-b border-border-color">Nuevo Cuatri</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map(g => {
                            const action = groupActions.find(ga => ga.id === g.id);
                            if (!action) return null;
                            return (
                                <tr key={g.id} className="border-b border-border-color last:border-0">
                                    <td className="p-2 font-medium">{g.name} <span className="text-xs text-text-secondary block">{g.subject}</span></td>
                                    <td className="p-2">{g.quarter || '-'}</td>
                                    <td className="p-2">
                                        <select 
                                            value={action.action} 
                                            onChange={(e) => handleActionChange(g.id, e.target.value as ActionType)}
                                            className="p-1 border border-border-color rounded bg-surface text-xs w-full"
                                        >
                                            <option value="promote">Promover (Subir)</option>
                                            <option value="retain">Repetir (Mismo)</option>
                                            <option value="delete">Eliminar / Graduar</option>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <input 
                                            type="text" 
                                            value={action.nextQuarter}
                                            onChange={(e) => handleQuarterChange(g.id, e.target.value)}
                                            disabled={action.action === 'delete'}
                                            className={`w-16 p-1 border border-border-color rounded bg-surface text-xs ${action.action === 'delete' ? 'opacity-50' : ''}`}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-4">
            <h3 className="font-bold text-lg mb-2">Paso 3: Configuración del Nuevo Ciclo</h3>
            <p className="text-sm text-text-secondary mb-4">
                Define las fechas clave para el próximo semestre. Esto reiniciará la asistencia y las calificaciones.
            </p>
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="block text-sm font-medium">Inicio del Semestre</label>
                    <input type="date" value={newSemesterStart} onChange={e => setNewSemesterStart(e.target.value)} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Fin del Primer Parcial</label>
                    <input type="date" value={newFirstPartialEnd} onChange={e => setNewFirstPartialEnd(e.target.value)} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Fin del Semestre</label>
                    <input type="date" value={newSemesterEnd} onChange={e => setNewSemesterEnd(e.target.value)} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface" />
                </div>
            </div>
            
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <Icon name="info" className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-red-700 dark:text-red-300">Advertencia Final</h4>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Al confirmar, se borrará toda la asistencia y calificaciones actuales de la vista principal. Los alumnos permanecerán en los grupos que hayas decidido conservar. Podrás ver los datos antiguos en "Historial de Ciclos".
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Asistente de Cierre de Ciclo" size="lg">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            
            <div className="flex justify-between mt-8 pt-4 border-t border-border-color">
                {step > 1 ? (
                    <Button variant="secondary" onClick={() => setStep(step - 1)}>
                        <Icon name="arrow-left" className="w-4 h-4"/> Anterior
                    </Button>
                ) : (
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                )}
                
                {step < 3 ? (
                    <Button onClick={() => setStep(step + 1)}>
                        Siguiente <Icon name="arrow-right" className="w-4 h-4"/>
                    </Button>
                ) : (
                    <Button onClick={executeTransition} className="bg-accent-red hover:bg-red-600 text-white">
                        Confirmar y Cerrar Ciclo
                    </Button>
                )}
            </div>
        </Modal>
    );
};

export default SemesterTransitionModal;
