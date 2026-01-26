
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
                        <Icon name="upload-cloud" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Estabilidad en la Nube</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se corrigió el error <strong>400 (Bad Request)</strong> al sincronizar asistencias. Ahora la comunicación con el servidor es más robusta y consistente.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-orange-100 p-2 rounded-xl text-orange-600 shrink-0">
                        <Icon name="users" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Deduplicación de Alumnos</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Continuamos mejorando la vista de <strong>Equipos Coyote</strong>. Si tienes al mismo alumno en varias materias, el sistema lo identifica y limpia automáticamente.
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-400 italic text-center">
                        "Build 2.9.0: Resolviendo problemas de conectividad para una mejor experiencia multi-materia."
                    </p>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Excelente, continuar!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
