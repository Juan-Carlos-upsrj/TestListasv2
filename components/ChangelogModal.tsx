
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
                    <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shrink-0">
                        <Icon name="settings" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Restauración de Configuración</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            ¡Perdón por el susto! Se restauraron los campos de **API (Cloud)**, **Google Calendar** y **Recordatorios** que habían desaparecido de la ventana de configuración.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 shrink-0">
                        <Icon name="upload-cloud" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Sincronización Corregida</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Al restaurar los campos de la API, el sistema puede volver a subir tus asistencias y fichas de tutoría correctamente.
                        </p>
                    </div>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Todo en orden, gracias!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
