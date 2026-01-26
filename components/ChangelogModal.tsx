
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
                    <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 shrink-0">
                        <Icon name="check-square" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Sincronización Inteligente</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se habilitó el envío de <strong>IDs únicos</strong> por alumno y grupo. Esto evita que los registros se sobrescriban en la base de datos y garantiza que toda la lista se suba correctamente.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-orange-100 p-2 rounded-xl text-orange-600 shrink-0">
                        <Icon name="upload-cloud" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Corrección de Comunicación</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se ajustó el formato de envío de asistencia para que coincida exactamente con lo que el servidor espera, eliminando los errores de "Bad Request".
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-400 italic text-center">
                        "Build 3.0.0: Datos íntegros y sincronización masiva optimizada."
                    </p>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Listo para probar!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
