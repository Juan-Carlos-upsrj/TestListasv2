
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
        <Modal isOpen={isOpen} onClose={onClose} title={`¿Qué hay de nuevo en v${APP_VERSION}?`} size="md">
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className="bg-rose-100 p-2 rounded-xl text-rose-600 shrink-0">
                        <Icon name="info" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Actualización Forzada</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Si sigues viendo la v1.8.5, el sistema de Android está bloqueando la actualización. Por favor, <strong>desinstala la app</strong> e instala el nuevo archivo generado.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 shrink-0">
                        <Icon name="users" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Gestión de Grupos Full</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se habilitó la edición completa de grupos: Nombre, Materia y <strong>Días de clase</strong>. Los cambios se reflejan instantáneamente en el calendario y pase de lista.
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-400 italic text-center">
                        "Build 3.1.1: Limpieza de caché y corrección de persistencia."
                    </p>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Entendido, vamos allá!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
