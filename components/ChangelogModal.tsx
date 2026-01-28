
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
                        <Icon name="settings" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Nueva Configuración</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se rediseñó la ventana de ajustes con una barra lateral de acceso rápido para que navegues por las secciones sin perderte.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-2 rounded-xl text-blue-600 shrink-0">
                        <Icon name="download-cloud" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Monitor de Descarga</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Ahora podrás ver en tiempo real cuánto falta para que se descargue la nueva versión gracias al nuevo indicador circular de porcentaje.
                        </p>
                    </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                    <p className="text-xs text-amber-800 font-bold text-center italic">
                        "La organización es la clave del éxito docente"
                    </p>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Explorar cambios!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
