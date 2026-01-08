
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Group, Evaluation } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import { v4 as uuidv4 } from 'uuid';

interface CopyEvaluationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetGroup: Group;
}

const CopyEvaluationsModal: React.FC<CopyEvaluationsModalProps> = ({ isOpen, onClose, targetGroup }) => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, evaluations } = state;

    const [sourceGroupId, setSourceGroupId] = useState<string>('');
    const [selectedEvalIds, setSelectedEvalIds] = useState<Set<string>>(new Set());

    const availableGroups = useMemo(() => 
        groups.filter(g => g.id !== targetGroup.id && evaluations[g.id]?.length > 0),
    [groups, evaluations, targetGroup.id]);

    const sourceEvaluations = useMemo(() => 
        evaluations[sourceGroupId] || [],
    [evaluations, sourceGroupId]);

    const handleToggleEval = (id: string) => {
        const newSet = new Set(selectedEvalIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedEvalIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedEvalIds.size === sourceEvaluations.length) {
            setSelectedEvalIds(new Set());
        } else {
            setSelectedEvalIds(new Set(sourceEvaluations.map(e => e.id)));
        }
    };

    const handleCopy = () => {
        if (selectedEvalIds.size === 0) return;

        const sourceGroup = groups.find(g => g.id === sourceGroupId);
        if (!sourceGroup) return;

        let copiedCount = 0;
        sourceEvaluations.forEach(ev => {
            if (selectedEvalIds.has(ev.id)) {
                // Find matching type by name in target group
                const sourceTypes = ev.partial === 1 ? sourceGroup.evaluationTypes.partial1 : sourceGroup.evaluationTypes.partial2;
                const targetTypes = ev.partial === 1 ? targetGroup.evaluationTypes.partial1 : targetGroup.evaluationTypes.partial2;
                
                const sourceType = sourceTypes.find(t => t.id === ev.typeId);
                let targetTypeId = targetTypes[0]?.id; // Default to first available

                if (sourceType) {
                    const matchedType = targetTypes.find(t => t.name.toLowerCase() === sourceType.name.toLowerCase());
                    if (matchedType) targetTypeId = matchedType.id;
                }

                const newEval: Evaluation = {
                    ...ev,
                    id: uuidv4(),
                    typeId: targetTypeId || ''
                };

                dispatch({ type: 'SAVE_EVALUATION', payload: { groupId: targetGroup.id, evaluation: newEval } });
                copiedCount++;
            }
        });

        dispatch({ type: 'ADD_TOAST', payload: { message: `Se copiaron ${copiedCount} evaluaciones con éxito.`, type: 'success' } });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importar Tareas/Evaluaciones" size="lg">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold mb-2 text-text-primary">1. Selecciona el grupo de origen:</label>
                    <select 
                        value={sourceGroupId} 
                        // Fix: Change setSelectedSet to setSelectedEvalIds
                        onChange={(e) => { setSourceGroupId(e.target.value); setSelectedEvalIds(new Set()); }}
                        className="w-full p-2.5 border border-border-color rounded-lg bg-surface focus:ring-2 focus:ring-primary"
                    >
                        <option value="" disabled>Selecciona un grupo...</option>
                        {availableGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.name} ({g.subject})</option>
                        ))}
                    </select>
                    {availableGroups.length === 0 && (
                        <p className="mt-2 text-xs text-accent-red">No hay otros grupos con evaluaciones creadas.</p>
                    )}
                </div>

                {sourceGroupId && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-text-primary">2. Elige qué evaluaciones copiar:</label>
                            <button 
                                onClick={handleSelectAll}
                                className="text-xs font-bold text-primary hover:underline"
                            >
                                {selectedEvalIds.size === sourceEvaluations.length ? 'Desmarcar todos' : 'Marcar todos'}
                            </button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto border border-border-color rounded-lg divide-y divide-border-color custom-scrollbar">
                            {sourceEvaluations.map(ev => (
                                <div 
                                    key={ev.id} 
                                    onClick={() => handleToggleEval(ev.id)}
                                    className="flex items-center gap-3 p-3 hover:bg-surface-secondary cursor-pointer transition-colors"
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={selectedEvalIds.has(ev.id)} 
                                        readOnly
                                        className="h-4 w-4 rounded text-primary focus:ring-primary"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{ev.name}</p>
                                        <div className="flex gap-2 text-[10px] text-text-secondary uppercase font-bold">
                                            <span className={ev.partial === 1 ? 'text-indigo-600' : 'text-blue-600'}>Parcial {ev.partial}</span>
                                            <span>•</span>
                                            <span>{ev.maxScore} Puntos</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 text-[11px] text-text-secondary italic">
                            Nota: Los promedios y calificaciones NO se copiarán, solo la estructura de las tareas.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 mt-8">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button 
                    onClick={handleCopy} 
                    disabled={selectedEvalIds.size === 0}
                >
                    <Icon name="copy" className="w-4 h-4"/> Copiar Seleccionadas ({selectedEvalIds.size})
                </Button>
            </div>
        </Modal>
    );
};

export default CopyEvaluationsModal;
