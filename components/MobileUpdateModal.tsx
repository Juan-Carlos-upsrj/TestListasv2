
import React from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import { MobileUpdateInfo } from '../types';

interface MobileUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    updateInfo: MobileUpdateInfo | null;
}

const MobileUpdateModal: React.FC<MobileUpdateModalProps> = ({ isOpen, onClose, updateInfo }) => {
    if (!updateInfo) return null;

    const handleDownload = () => {
        // Implement cache-busting to prevent Android from installing an old cached version of the APK.
        const cacheBuster = `cb=${Date.now()}`;
        const finalUrl = updateInfo.url.includes('?') 
            ? `${updateInfo.url}&${cacheBuster}` 
            : `${updateInfo.url}?${cacheBuster}`;
            
        console.log("Iniciando descarga con anti-cache:", finalUrl);
        
        // Use '_system' to force opening in the external browser (Chrome/Safari)
        window.open(finalUrl, '_system');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="¡Actualización Crítica!" size="md">
            <div className="text-center">
                <div className="bg-indigo-100 text-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="download-cloud" className="w-8 h-8" />
                </div>
                
                <h3 className="text-xl font-bold mb-2">Nueva Versión {updateInfo.version}</h3>
                
                <div className="bg-surface-secondary p-4 rounded-lg text-left mb-6 border border-border-color">
                    <p className="font-semibold text-sm mb-1 text-rose-600">⚠ IMPORTANTE PARA ANDROID:</p>
                    <p className="text-xs mb-3 text-text-secondary leading-relaxed">
                        Si al instalar el archivo la aplicación no cambia, debes <strong>desinstalar la versión actual</strong> de tu teléfono e instalar este nuevo APK.
                    </p>
                    <p className="font-semibold text-sm mb-1 text-text-secondary">Novedades:</p>
                    <p className="text-xs whitespace-pre-wrap">{updateInfo.notes || "Corrección de errores de actualización y mejoras en gestión de grupos."}</p>
                </div>

                <div className="flex flex-col gap-3">
                    <Button onClick={handleDownload} className="w-full justify-center">
                        Descargar APK v{updateInfo.version}
                    </Button>
                    <Button variant="secondary" onClick={onClose} className="w-full justify-center">
                        Entendido
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default MobileUpdateModal;
