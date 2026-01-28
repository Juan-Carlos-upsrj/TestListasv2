
import React from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import { APP_VERSION } from '../constants';

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Actualizado a v${APP_VERSION}`} size="md">
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-2 rounded-xl text-blue-600 shrink-0">
                        <Icon name="calendar" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Control de Rangos</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se añadieron campos específicos para las fechas de inicio y fin de evaluaciones por parcial. El fin del 1er parcial ahora marca automáticamente el inicio del 2do para asistencias.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 shrink-0">
                        <Icon name="layout" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Sidebar Agilizada</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Las acciones más importantes como cargar horario y subir asistencias ahora están arriba de todo, separadas por categorías de ciclo.
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
                    <p className="text-xs text-blue-800 font-bold text-center italic">
                        "Estructuramos tu flujo de trabajo para un cuatrimestre sin estrés."
                    </p>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Configurar mi ciclo!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
