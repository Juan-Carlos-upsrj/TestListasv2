
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
                    <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 shrink-0">
                        <Icon name="check-circle-2" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Compilación Arreglada</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se habilitó visualmente la sección de **Historial de Ciclos** en Configuración. Esto corrige el error que impedía generar el instalador de Windows.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-2 rounded-xl text-blue-600 shrink-0">
                        <Icon name="download-cloud" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Gestión de Archivos</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Ahora puedes restaurar o eliminar respaldos de semestres pasados directamente desde la ventana de Configuración.
                        </p>
                    </div>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Excelente, continuar!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
