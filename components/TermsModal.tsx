import React from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Términos y Condiciones del Software" size="lg">
            <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <h4 className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-2 uppercase tracking-tight">
                        <Icon name="shield" className="w-4 h-4" /> 1. TITULARIDAD
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Este software (incluyendo código fuente, algoritmos, diseño de interfaz y base de datos), denominado comercialmente <strong>"Ecosistema IAEV"</strong>, es propiedad intelectual exclusiva de <strong>Juan Carlos Salgado Robles</strong> (en adelante, "EL AUTOR"). No constituye una obra por encargo ni propiedad de la institución, salvo acuerdo contractual posterior firmado por ambas partes.
                    </p>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <h4 className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2 uppercase tracking-tight">
                        <Icon name="graduation-cap" className="w-4 h-4" /> 2. LICENCIA DE USO LIMITADA
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Se otorga a la <strong>Universidad Politécnica de Santa Rosa Jáuregui</strong> una licencia temporal, no exclusiva, intransferible y revocable, únicamente para fines de Evaluación, Pruebas Piloto y Gestión Académica Interna.
                    </p>
                </div>

                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                    <h4 className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-2 uppercase tracking-tight">
                        <Icon name="x-circle" className="w-4 h-4" /> 3. RESTRICCIONES
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Queda estrictamente prohibida la copia, modificación, ingeniería inversa, sublicenciamiento o comercialización de este software a terceros sin la autorización expresa y por escrito de <strong>EL AUTOR</strong>.
                    </p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <h4 className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-2 uppercase tracking-tight">
                        <Icon name="info" className="w-4 h-4" /> 4. DESLINDE DE RESPONSABILIDAD
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        El software se proporciona "tal cual" (as-is) para fines operativos. <strong>EL AUTOR</strong> no asume responsabilidad financiera por interrupciones del servicio o pérdida de datos derivada de fallos en la infraestructura de hardware o red ajena al código.
                    </p>
                </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-slate-100 space-y-4">
                <div className="text-center space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        © 2026 Juan Carlos Salgado Robles. Todos los derechos reservados.
                    </p>
                    <p className="text-[9px] text-slate-400 leading-tight max-w-md mx-auto italic">
                        Desarrollado por Juan Carlos Salgado Robles. Uso autorizado bajo licencia exclusiva para la Universidad Politécnica de Santa Rosa Jáuregui. Prohibida su distribución externa sin consentimiento por escrito del autor.
                    </p>
                </div>
                
                <Button onClick={onClose} className="w-full">
                    He leído y acepto los términos
                </Button>
            </div>
        </Modal>
    );
};

export default TermsModal;