
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { Settings, Archive } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import ConfirmationModal from './common/ConfirmationModal';
import { APP_VERSION, GROUP_COLORS } from '../constants';
import { exportBackup, importBackup } from '../services/backupService';
import Icon from './icons/Icon';
import { syncAttendanceData, syncScheduleData } from '../services/syncService';
import SemesterTransitionModal from './SemesterTransitionModal';
import { checkForMobileUpdate } from '../services/mobileUpdateService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { state, dispatch } = useContext(AppContext);
    const [settings, setSettings] = useState<Settings>(state.settings);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [updateStatus, setUpdateStatus] = useState<string>('');
    const [isChecking, setIsChecking] = useState(false);
    const [isTransitionOpen, setTransitionOpen] = useState(false);

    // --- Confirmation States ---
    const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
    const [pendingRestoreArchive, setPendingRestoreArchive] = useState<Archive | null>(null);
    const [pendingDeleteArchive, setPendingDeleteArchive] = useState<Archive | null>(null);
    const [showHardResetConfirm, setShowHardResetConfirm] = useState(false);

    useEffect(() => {
        setSettings(state.settings);
    }, [state.settings, isOpen]);
    
    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.onUpdateAvailable(() => {
                setUpdateStatus('Actualización disponible. Descargando...');
                setIsChecking(false);
            });
            window.electronAPI.onUpdateNotAvailable(() => {
                setUpdateStatus('Tienes la última versión.');
                setIsChecking(false);
            });
            window.electronAPI.onUpdateError((msg) => {
                setUpdateStatus(`Error al buscar: ${msg}`);
                setIsChecking(false);
            });
            window.electronAPI.onUpdateDownloaded(() => {
                setUpdateStatus('¡Lista! Reinicia para actualizar.');
                setIsChecking(false);
            });
        }
    }, []);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        let finalValue: string | number | boolean = value;
        if (type === 'checkbox') {
            finalValue = (e.target as HTMLInputElement).checked;
        } else if (type === 'number') {
            finalValue = Number(value);
        }
        
        setSettings(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSave = () => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Configuración guardada.', type: 'success' } });
        onClose();
    };

    const handleExport = () => {
        exportBackup(state);
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Exportando datos...', type: 'info' } });
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };
    
    const handleCheckForUpdates = async () => {
        setIsChecking(true);
        setUpdateStatus('Buscando actualizaciones...');
        
        if (window.electronAPI) {
            window.electronAPI.checkForUpdates();
        } else if (settings.mobileUpdateUrl) {
            try {
                const updateInfo = await checkForMobileUpdate(settings.mobileUpdateUrl, APP_VERSION);
                if (updateInfo) {
                    setUpdateStatus(`¡Nueva versión ${updateInfo.version} disponible!`);
                } else {
                    setUpdateStatus('Tienes la última versión.');
                }
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Error desconocido';
                setUpdateStatus(`Error: ${msg.substring(0, 30)}...`);
            }
            setIsChecking(false);
        } else {
            setUpdateStatus('Configura la URL de actualización primero.');
            setIsChecking(false);
        }
    };

    const handleHardReset = () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (let registration of registrations) {
                    registration.unregister();
                }
            });
        }
        window.location.href = window.location.origin + '?cb=' + Date.now();
    };

    const confirmImportAction = async () => {
        if (pendingImportFile) {
            try {
                const importedData = await importBackup(pendingImportFile);
                dispatch({ type: 'SET_INITIAL_STATE', payload: importedData });
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Datos importados con éxito.', type: 'success' } });
                onClose();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Error desconocido al importar.';
                dispatch({ type: 'ADD_TOAST', payload: { message: errorMessage, type: 'error' } });
            }
            setPendingImportFile(null);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPendingImportFile(file);
        }
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    const confirmRestoreAction = () => {
        if (pendingRestoreArchive) {
            dispatch({ type: 'RESTORE_ARCHIVE', payload: pendingRestoreArchive.id });
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Ciclo restaurado.', type: 'success' } });
            onClose();
            setPendingRestoreArchive(null);
        }
    };

    const confirmDeleteArchiveAction = () => {
        if (pendingDeleteArchive) {
            dispatch({ type: 'DELETE_ARCHIVE', payload: pendingDeleteArchive.id });
            setPendingDeleteArchive(null);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={`Configuración (v${APP_VERSION})`} size="lg">
                <div className="space-y-6">
                    
                    <fieldset className="border p-4 rounded-lg border-border-color">
                         <legend className="px-2 font-semibold">Sistema y Actualizaciones</legend>
                         
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm font-medium">Estado de la Versión</p>
                                <p className="text-xs text-text-secondary truncate max-w-[200px]" title={updateStatus}>
                                    {updateStatus || 'Versión actual instalada.'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => setShowHardResetConfirm(true)} title="Forzar recarga de archivos">
                                    <Icon name="list-checks" className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="secondary" onClick={handleCheckForUpdates} disabled={isChecking}>
                                    {isChecking ? 'Buscando...' : 'Buscar Actualizaciones'}
                                </Button>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="mobileUpdateUrl" className="block text-sm font-medium">Repositorio de Actualizaciones (GitHub)</label>
                                <input
                                    type="url"
                                    id="mobileUpdateUrl"
                                    name="mobileUpdateUrl"
                                    value={settings.mobileUpdateUrl || ''}
                                    onChange={handleChange}
                                    placeholder="https://github.com/usuario/repositorio"
                                    className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-lg border-border-color bg-indigo-50/30">
                        <legend className="px-2 font-bold text-indigo-700">Conexión a la Nube (API)</legend>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="apiUrl" className="block text-sm font-medium">URL de la API (api.php)</label>
                                    <input type="url" name="apiUrl" value={settings.apiUrl} onChange={handleChange} placeholder="https://tu-sitio.com/api.php" className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label htmlFor="apiKey" className="block text-sm font-medium">API Key (X-API-KEY)</label>
                                    <input type="password" name="apiKey" value={settings.apiKey} onChange={handleChange} placeholder="Tu clave secreta" className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => syncAttendanceData(state, dispatch, 'all')} className="w-full text-xs">
                                    <Icon name="upload-cloud" className="w-4 h-4" /> Sinc. Asistencia Completa
                                </Button>
                                <Button variant="secondary" onClick={() => syncScheduleData(state, dispatch)} className="w-full text-xs bg-indigo-600 text-white hover:bg-indigo-700">
                                    <Icon name="download-cloud" className="w-4 h-4" /> Forzar Sinc. Horario
                                </Button>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-lg border-border-color">
                        <legend className="px-2 font-semibold">Calendario Externo (Google)</legend>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="googleCalendarUrl" className="block text-sm font-medium">URL Pública del Calendario (iCal/ICS)</label>
                                <input
                                    type="url"
                                    id="googleCalendarUrl"
                                    name="googleCalendarUrl"
                                    value={settings.googleCalendarUrl || ''}
                                    onChange={handleChange}
                                    placeholder="https://calendar.google.com/.../basic.ics"
                                    className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Color de los Eventos</label>
                                <div className="flex flex-wrap gap-2">
                                    {GROUP_COLORS.slice(0, 8).map(color => (
                                        <button
                                            key={color.name}
                                            type="button"
                                            onClick={() => setSettings(prev => ({ ...prev, googleCalendarColor: color.name }))}
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${color.bg} ${settings.googleCalendarColor === color.name ? 'border-primary scale-110 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-lg border-border-color">
                        <legend className="px-2 font-semibold">Periodo y Docencia</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div className="col-span-1 sm:col-span-2">
                                <label htmlFor="professorName" className="block text-sm font-medium">Nombre del Profesor/a</label>
                                <input
                                    type="text"
                                    id="professorName"
                                    name="professorName"
                                    value={settings.professorName}
                                    onChange={handleChange}
                                    className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Inicio Semestre</label>
                                <input type="date" name="semesterStart" value={settings.semesterStart} onChange={handleChange} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Fin Semestre</label>
                                <input type="date" name="semesterEnd" value={settings.semesterEnd} onChange={handleChange} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface" />
                            </div>
                        </div>
                        <Button onClick={() => setTransitionOpen(true)} className="w-full justify-center bg-rose-600 hover:bg-rose-700 text-white">
                            <Icon name="users" className="w-4 h-4"/> Asistente de Cierre de Ciclo
                        </Button>
                    </fieldset>

                     <fieldset className="border p-4 rounded-lg border-border-color">
                         <legend className="px-2 font-semibold">Preferencias y Notificaciones</legend>
                         <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label htmlFor="showMatricula" className="font-medium text-sm">Mostrar Matrícula</label>
                                <input type="checkbox" id="showMatricula" name="showMatricula" checked={settings.showMatricula} onChange={handleChange} className="h-5 w-5 rounded text-primary" />
                            </div>
                            
                            <div className="pt-2 border-t border-border-color">
                                <div className="flex items-center justify-between mb-3">
                                    <label htmlFor="enableReminders" className="font-bold text-sm text-indigo-600">Recordatorios de Clase</label>
                                    <input type="checkbox" id="enableReminders" name="enableReminders" checked={settings.enableReminders} onChange={handleChange} className="h-5 w-5 rounded text-indigo-600" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="text-xs text-text-secondary whitespace-nowrap">Anticipación (minutos):</label>
                                    <input type="number" name="reminderTime" value={settings.reminderTime} onChange={handleChange} min="1" max="60" className="w-20 p-1 text-sm border border-border-color rounded bg-surface" />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-border-color">
                                <label htmlFor="sidebarGroupDisplayMode" className="block text-sm font-medium mb-1">Vista de Grupos en Barra Lateral</label>
                                <select 
                                    id="sidebarGroupDisplayMode" 
                                    name="sidebarGroupDisplayMode" 
                                    value={settings.sidebarGroupDisplayMode} 
                                    onChange={handleChange}
                                    className="w-full p-2 border border-border-color rounded-md bg-surface text-sm"
                                >
                                    <option value="name">Solo Nombre (6A)</option>
                                    <option value="name-abbrev">Nombre + Abreviatura (6A - MAT)</option>
                                    <option value="abbrev">Solo Abreviatura (MAT)</option>
                                </select>
                            </div>
                         </div>
                     </fieldset>

                     <fieldset className="border p-4 rounded-lg border-border-color">
                        <legend className="px-2 font-semibold">Respaldo Local</legend>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="secondary" onClick={handleExport} className="w-full text-xs">
                                <Icon name="download-cloud" className="w-4 h-4" /> Exportar JSON
                            </Button>
                            <Button variant="secondary" onClick={handleImportClick} className="w-full text-xs">
                                <Icon name="upload-cloud" className="w-4 h-4" /> Importar JSON
                            </Button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                        </div>
                    </fieldset>
                    
                </div>
                 <div className="flex justify-end gap-3 mt-8">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Cambios</Button>
                </div>
            </Modal>
            
            <SemesterTransitionModal isOpen={isTransitionOpen} onClose={() => setTransitionOpen(false)} />

            <ConfirmationModal
                isOpen={showHardResetConfirm}
                onClose={() => setShowHardResetConfirm(false)}
                onConfirm={handleHardReset}
                title="Limpieza Profunda"
                variant="danger"
                confirmText="Reiniciar App"
            >
                Esta acción intentará eliminar la caché del navegador para forzar la actualización a la v{APP_VERSION}. 
                <br/><br/>
                <strong>No se borrarán tus datos guardados</strong>.
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={!!pendingImportFile}
                onClose={() => setPendingImportFile(null)}
                onConfirm={confirmImportAction}
                title="Importar Respaldo"
                variant="danger"
                confirmText="Importar"
            >
                ¿Estás seguro? <strong>Todos los datos actuales se reemplazarán permanentemente.</strong>
            </ConfirmationModal>
        </>
    );
};

export default SettingsModal;
