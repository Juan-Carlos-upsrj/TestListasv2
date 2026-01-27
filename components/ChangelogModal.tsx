
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
                        <h4 className="font-bold text-slate-800">Sincronización Mejorada</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se implementó un sistema de rescate de tutorías. Ahora la app intenta emparejar las notas por nombre de alumno si los IDs internos no coinciden, solucionando el problema de las notas que no aparecían.
                        </p>
                    </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                    <p className="text-xs text-amber-800 font-bold text-center">
                        RECUERDA: Si ves la versión vieja, desinstala la app antes de poner el nuevo APK generado con versionCode 316.
                    </p>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Entendido, vamos!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
