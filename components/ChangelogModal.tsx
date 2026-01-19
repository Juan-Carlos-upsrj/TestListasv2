
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
                        <Icon name="layout" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Organización por Cuatrimestre</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Tus grupos ahora se ordenan automáticamente por cuatrimestre. Además, añadimos un indicador visual circular en el menú para que los identifiques más rápido.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-rose-100 p-2 rounded-xl text-rose-600 shrink-0">
                        <Icon name="check-square" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Indicador de Riesgo Refinado</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Cambiamos la etiqueta "BAJA" por <strong>"RIESGO"</strong> y corregimos errores visuales en la tabla de asistencia que dificultaban la lectura de los estados en filas resaltadas.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 shrink-0">
                        <Icon name="info" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Mejoras de Rendimiento</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Optimizamos la carga de las tablas para que el cambio entre grupos sea más fluido, especialmente en dispositivos móviles.
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-400 italic text-center">
                        "Seguimos trabajando para que tu gestión académica sea lo más eficiente y amigable posible."
                    </p>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Genial, gracias!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
