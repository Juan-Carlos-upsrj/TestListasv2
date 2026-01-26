
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
        // This is crucial for Android to handle the download correctly without freezing the WebView.
        window.open(finalUrl, '_system');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="¡Actualización Disponible!" size="md">
            <div className="text-center">
                <div className="bg-indigo-100 text-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="download-cloud" className="w-8 h-8" />
                </div>
                
                <h3 className="text-xl font-bold mb-2">Nueva Versión {updateInfo.version}</h3>
                
                <div className="bg-surface-secondary p-4 rounded-lg text-left mb-6 border border-border-color">
                    <p className="font-semibold text-sm mb-1 text-text-secondary">Novedades:</p>
                    <p className="text-sm whitespace-pre-wrap">{updateInfo.notes || "Mejoras de rendimiento y corrección de errores."}</p>
                </div>

                <div className="flex flex-col gap-3">
                    <Button onClick={handleDownload} className="w-full justify-center">
                        Descargar e Instalar
                    </Button>
                    <Button variant="secondary" onClick={onClose} className="w-full justify-center">
                        Quizás más tarde
                    </Button>
                </div>
                
                <p className="text-xs text-text-secondary mt-4">
                    Nota: Se abrirá el navegador para descargar el APK. Deberás permitir la instalación desde fuentes desconocidas si se te solicita.
                </p>
            </div>
        </Modal>
    );
};

export default MobileUpdateModal;
