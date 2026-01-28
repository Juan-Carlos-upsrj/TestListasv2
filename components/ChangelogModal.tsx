
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
                    <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 shrink-0">
                        <Icon name="layout" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Panel Rápido de Ajustes</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se agregaron botones de acceso directo en el panel izquierdo de Configuración para sincronizar asistencias, cargar horario y cerrar ciclo sin dar vueltas.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 shrink-0">
                        <Icon name="upload-cloud" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Sincronización Total</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Ahora puedes subir las calificaciones (promedios) a la nube directamente desde la ventana de configuración.
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
                    <p className="text-xs text-blue-800 font-bold text-center italic">
                        "Optimizamos tu flujo de trabajo para que te enfoques en enseñar."
                    </p>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Probar nuevo panel!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
