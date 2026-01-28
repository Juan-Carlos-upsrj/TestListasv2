
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
                        <h4 className="font-bold text-slate-800">Versión Estable 3.2.0</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se corrigió el error que impedía generar el instalador de Windows. ¡La compilación ahora es 100% exitosa!
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 shrink-0">
                        <Icon name="settings" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Interfaz Pulida</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se eliminaron funciones obsoletas y se optimizó el panel lateral de navegación en Configuración para un acceso más rápido.
                        </p>
                    </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200">
                    <p className="text-xs text-indigo-800 font-bold text-center italic">
                        "Código limpio, mente tranquila. ¡A seguir enseñando!"
                    </p>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Listo, a trabajar!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
