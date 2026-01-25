
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
                        <Icon name="book-marked" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Nueva Sección: Tutoreo Académico</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            ¡Ya puedes crear <strong>fichas estudiantiles</strong>! Registra fortalezas, áreas de oportunidad y notas académicas para un seguimiento más humano de tus alumnos.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 shrink-0">
                        <Icon name="download-cloud" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Sincronización en la Nube</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Colabora con otros profes: Ahora puedes <strong>sincronizar las fichas automáticamente</strong>. Los demás maestros podrán leer tus notas de tutoría, garantizando un acompañamiento integral.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shrink-0">
                        <Icon name="graduation-cap" className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Permisos por Tutor</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Asigna al tutor en la <strong>Configuración del Grupo</strong>. Solo el profesor que coincida con el nombre del tutor podrá editar las fichas; los demás las verán en modo lectura.
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-400 italic text-center">
                        "Build Final: Se corrigieron los errores de TypeScript en la vista de Calificaciones y se optimizó el proceso de empaquetado del instalador."
                    </p>
                </div>

                <Button onClick={onClose} className="w-full justify-center">
                    ¡Entendido, a trabajar!
                </Button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
