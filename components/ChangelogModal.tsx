
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
                        <Icon name="grid" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Control de Equipos Avanzado</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            ¡Vuelven los trabajos individuales! Ahora puedes buscar por equipo o alumno y ver rápidamente quién falta por asignar en una sección especial de "Sin Asignar".
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-orange-100 p-2 rounded-xl text-orange-600 shrink-0">
                        <Icon name="search" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Búsqueda Unificada (Nombre + Apodo)</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            En todas las secciones (Asistencia, Calificaciones, Grupos y Tutoreo), el buscador ahora reconoce tanto el nombre oficial como el apodo/nickname del alumno.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 shrink-0">
                        <Icon name="user-plus" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Asignación Rápida</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Se añadió un botón en la vista de equipos para marcar directamente a un alumno como "Trabajo Individual" sin tener que escribirlo manualmente.
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-400 italic text-center">
                        "Build 2.7.0: Optimizando la velocidad de gestión y el control de equipos Coyote."
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
