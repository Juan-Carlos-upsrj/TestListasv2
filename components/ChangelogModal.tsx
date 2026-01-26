
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
                        <h4 className="font-bold text-slate-800">¡Error de Build Solucionado!</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se corrigió un error de sintaxis que bloqueaba la generación de nuevos archivos. Ahora el comando <code>npm run build</code> funciona correctamente.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-rose-100 p-2 rounded-xl text-rose-600 shrink-0">
                        <Icon name="info" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Actualización en el Teléfono</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Debido a la caché de Android, <strong>debes desinstalar la app v1.8.5</strong> antes de instalar este nuevo APK para ver los cambios reflejados.
                        </p>
                    </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                    <p className="text-xs text-indigo-700 font-bold text-center italic">
                        "Build 3.1.4: Compilación limpia y lista para Android."
                    </p>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Vamos allá!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
