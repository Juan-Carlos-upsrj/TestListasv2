import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Group, AttendanceStatus } from '../types';
import { ATTENDANCE_STATUSES } from '../constants';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';

interface BulkAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: Group;
}

const BulkAttendanceModal: React.FC<BulkAttendanceModalProps> = ({ isOpen, onClose, group }) => {
    const { dispatch } = useContext(AppContext);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.Present);
    const [overwrite, setOverwrite] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (new Date(endDate) < new Date(startDate)) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'La fecha de fin no puede ser anterior a la de inicio.', type: 'error' } });
            return;
        }

        dispatch({
            type: 'BULK_UPDATE_ATTENDANCE',
            payload: {
                groupId: group.id,
                startDate,
                endDate,
                status,
                overwrite
            }
        });
        
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Asistencia actualizada correctamente.', type: 'success' } });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Relleno Rápido de Asistencia: ${group.name}`}>
            <form onSubmit={handleSubmit}>
                <p className="mb-4 text-text-secondary text-sm">
                    Esta herramienta rellenará todos los días de clase sin asistencia dentro del rango seleccionado.
                </p>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium">Desde</label>
                            <input
                                type="date"
                                id="startDate"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                                className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium">Hasta</label>
                            <input
                                type="date"
                                id="endDate"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                                className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium">Aplicar Estado</label>
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                            className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary"
                        >
                            {ATTENDANCE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="overwrite"
                            checked={overwrite}
                            onChange={(e) => setOverwrite(e.target.checked)}
                            className="h-4 w-4 rounded text-primary focus:ring-primary"
                        />
                        <label htmlFor="overwrite" className="text-sm font-medium">
                            Sobrescribir registros existentes
                        </label>
                    </div>
                    {overwrite && (
                         <div className="p-2 bg-accent-yellow-light text-accent-yellow-dark text-xs rounded-md flex items-center gap-2">
                            <Icon name="info" className="w-4 h-4 flex-shrink-0"/>
                            <span><strong>¡Atención!</strong> Esta opción reemplazará cualquier asistencia (presente, ausente, etc.) que ya hayas registrado en el rango seleccionado.</span>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">
                        <Icon name="check-square" className="w-4 h-4"/> Aplicar
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default BulkAttendanceModal;