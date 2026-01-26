
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
                    <div className="bg-orange-100 p-2 rounded-xl text-orange-600 shrink-0">
                        <Icon name="grid" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Equipos Coyote Globales</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            ¡Colaboración entre grupos! Ahora puedes ver integrantes de diferentes salones en una misma ficha de <strong>Equipo Coyote</strong>, siempre que pertenezcan al mismo cuatrimestre.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 shrink-0">
                        <Icon name="layout" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Diseño Optimizado (Compacto)</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Hemos reducido el tamaño de los encabezados y tarjetas en la <strong>Gestión de Grupos</strong>. Ahora tienes más espacio vertical para ver tus listas de alumnos sin hacer tanto scroll.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 shrink-0">
                        <Icon name="users" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Distintivos de Grupo</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            En las vistas de equipos, cada alumno ahora tiene una pequeña etiqueta que indica a qué grupo pertenece (ej. [6A], [6B]), facilitando la identificación rápida.
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-400 italic text-center">
                        "Build 2.6.0: Sincronización mejorada y corrección de visibilidad en dispositivos móviles."
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
