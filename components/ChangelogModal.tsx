
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
                        <h4 className="font-bold text-slate-800">Compilación Exitosa</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se corrigieron los errores de código muerto que causaban que el proceso de empaquetado fallara. Ahora la carpeta <code>dist</code> se genera correctamente.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-rose-100 p-2 rounded-xl text-rose-600 shrink-0">
                        <Icon name="info" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Nota para Android Studio</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Es vital cambiar el <strong>versionCode</strong> a <code>313</code> en el archivo <code>build.gradle</code> para que Android sepa que este archivo es más reciente que el anterior.
                        </p>
                    </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                    <p className="text-xs text-indigo-700 font-bold text-center italic">
                        "Build 3.1.3: Limpieza total de errores de compilación."
                    </p>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Todo listo, continuar!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
