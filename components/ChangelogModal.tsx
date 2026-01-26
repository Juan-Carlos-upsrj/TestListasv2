
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
                    <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 shrink-0">
                        <Icon name="check-circle-2" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Build Corregida</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se eliminaron los errores de código que impedían generar la APK. Ahora puedes ejecutar <code>npm run build</code> sin problemas técnicos.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 shrink-0">
                        <Icon name="users" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Gestión de Grupos</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Revisión completa de la edición de grupos: Nombre, Materia y Horarios. Los cambios se sincronizan ahora con mayor estabilidad.
                        </p>
                    </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                    <p className="text-xs text-amber-700 font-bold text-center">
                        RECUERDA: Cambia el 'versionCode' en Android Studio para que el teléfono acepte el nuevo APK.
                    </p>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Listo, continuar!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
