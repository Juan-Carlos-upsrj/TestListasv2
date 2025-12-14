
import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { Settings } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import { GROUP_COLORS, APP_VERSION } from '../constants';
import { exportBackup, importBackup } from '../services/backupService';
import Icon from './icons/Icon';
import { syncAttendanceData, syncScheduleData, syncGradesData } from '../services/syncService';
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
            // Logic for Web/Mobile
            try {
                const updateInfo = await checkForMobileUpdate(settings.mobileUpdateUrl, APP_VERSION);
                if (updateInfo) {
                    setUpdateStatus(`¡Nueva versión ${updateInfo.version} disponible!`);
                } else {
                    setUpdateStatus('Tienes la última versión.');
                }
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Error desconocido';
                // Show a shortened error message
                setUpdateStatus(`Error: ${msg.substring(0, 30)}...`);
            }
            setIsChecking(false);
        } else {
            setUpdateStatus('Configura la URL de actualización primero.');
            setIsChecking(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (window.confirm('¿Estás seguro de que quieres importar este archivo? Todos los datos actuales se reemplazarán.')) {
                try {
                    const importedData = await importBackup(file);
                    dispatch({ type: 'SET_INITIAL_STATE', payload: importedData });
                    dispatch({ type: 'ADD_TOAST', payload: { message: 'Datos importados con éxito.', type: 'success' } });
                    onClose();
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al importar.';
                    dispatch({ type: 'ADD_TOAST', payload: { message: errorMessage, type: 'error' } });
                }
            }
        }
        // Reset file input value to allow re-uploading the same file
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    const handleRestoreArchive = (archiveId: string) => {
        if(window.confirm('¿Restaurar este ciclo antiguo? Perderás los datos actuales no guardados si no has hecho un respaldo.')) {
            dispatch({ type: 'RESTORE_ARCHIVE', payload: archiveId });
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Ciclo restaurado.', type: 'success' } });
            onClose();
        }
    };

    const handleDeleteArchive = (archiveId: string) => {
        if(window.confirm('¿Eliminar este respaldo permanentemente?')) {
            dispatch({ type: 'DELETE_ARCHIVE', payload: archiveId });
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={`Configuración (v${APP_VERSION})`} size="lg">
                <div className="space-y-6">
                    
                    <fieldset className="border p-4 rounded-lg border-border-color">
                         <legend className="px-2 font-semibold">Sistema</legend>
                         
                         {/* Unified Update UI */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Actualizaciones Automáticas {window.electronAPI ? '(PC)' : '(Móvil/Web)'}</p>
                                <p className="text-xs text-text-secondary truncate max-w-[200px]" title={updateStatus}>
                                    {updateStatus || 'Versión actual instalada.'}
                                </p>
                            </div>
                            <Button size="sm" variant="secondary" onClick={handleCheckForUpdates} disabled={isChecking}>
                                {isChecking ? 'Buscando...' : 'Buscar Actualizaciones'}
                            </Button>
                        </div>
                        
                         {/* Extra Mobile config if needed */}
                         {!window.electronAPI && (
                             <div className="mt-4 pt-4 border-t border-border-color">
                                <label htmlFor="mobileUpdateUrl" className="block text-sm font-medium">Repositorio de GitHub</label>
                                <input
                                    type="url"
                                    id="mobileUpdateUrl"
                                    name="mobileUpdateUrl"
                                    value={settings.mobileUpdateUrl || ''}
                                    onChange={handleChange}
                                    placeholder="https://github.com/usuario/repositorio"
                                    className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary"
                                />
                                <p className="text-xs text-text-secondary mt-1">
                                    Introduce la URL principal del repositorio. El sistema buscará automáticamente en la sección de "Releases".
                                </p>
                             </div>
                         )}
                    </fieldset>

                    <fieldset className="border p-4 rounded-lg border-border-color">
                        <legend className="px-2 font-semibold">Periodo del Semestre</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Inicio del Semestre</label>
                                <input type="date" name="semesterStart" value={settings.semesterStart} onChange={handleChange} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Fin del Primer Parcial</label>
                                <input type="date" name="firstPartialEnd" value={settings.firstPartialEnd} onChange={handleChange} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Fin del Semestre</label>
                                <input type="date" name="semesterEnd" value={settings.semesterEnd} onChange={handleChange} className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary" />
                            </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-border-color">
                            <Button onClick={() => setTransitionOpen(true)} className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Icon name="users" className="w-4 h-4"/> Asistente de Cierre de Ciclo
                            </Button>
                            <p className="text-xs text-text-secondary mt-2 text-center">Usa esto al finalizar el cuatrimestre para promover grupos y limpiar datos.</p>
                        </div>
                    </fieldset>
                    
                    {state.archives.length > 0 && (
                        <fieldset className="border p-4 rounded-lg border-border-color bg-slate-50 dark:bg-slate-800/50">
                            <legend className="px-2 font-semibold text-indigo-600 dark:text-indigo-400">Historial de Ciclos</legend>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {state.archives.map(archive => (
                                    <div key={archive.id} className="flex items-center justify-between p-2 bg-surface rounded border border-border-color text-sm">
                                        <div>
                                            <p className="font-semibold">{archive.name}</p>
                                            <p className="text-xs text-text-secondary">{new Date(archive.dateArchived).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleRestoreArchive(archive.id)} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs font-medium">Cargar</button>
                                            <button onClick={() => handleDeleteArchive(archive.id)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Icon name="trash-2" className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </fieldset>
                    )}
                    
                     <fieldset className="border p-4 rounded-lg border-border-color">
                        <legend className="px-2 font-semibold">Información del Docente</legend>
                        <div>
                            <label htmlFor="professorName" className="block text-sm font-medium">Nombre del Profesor/a</label>
                            <input
                                type="text"
                                id="professorName"
                                name="professorName"
                                value={settings.professorName}
                                onChange={handleChange}
                                placeholder="Ej. Prof. Juan Pérez"
                                className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary"
                            />
                            <p className="text-xs text-text-secondary mt-1">Este nombre aparecerá en los reportes generados y se usará para la sincronización de horarios.</p>
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-lg border-border-color">
                        <legend className="px-2 font-semibold">Integración de Calendario</legend>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="googleCalendarUrl" className="block text-sm font-medium">URL de Google Calendar (formato iCal público)</label>
                                <input
                                    type="url"
                                    id="googleCalendarUrl"
                                    name="googleCalendarUrl"
                                    value={settings.googleCalendarUrl}
                                    onChange={handleChange}
                                    placeholder="Pega aquí la dirección pública en formato iCal"
                                    className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary"
                                />
                                <p className="text-xs text-text-secondary mt-1">Esto permitirá mostrar los eventos de tu calendario de Google directamente en la aplicación.</p>
                            </div>
                             <div>
                                <label className="block text-sm font-medium mb-2">Color para Eventos de Google Calendar</label>
                                <div className="flex flex-wrap gap-3">
                                    {GROUP_COLORS.map(c => (
                                        <button
                                            type="button"
                                            key={c.name}
                                            onClick={() => setSettings(s => ({ ...s, googleCalendarColor: c.name }))}
                                            title={c.name}
                                            className={`w-8 h-8 rounded-full ${c.bg} transition-transform transform hover:scale-110 focus:outline-none ${settings.googleCalendarColor === c.name ? 'ring-2 ring-offset-2 ring-primary ring-offset-surface' : ''}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-lg border-border-color">
                        <legend className="px-2 font-semibold">Sincronización con Servidor</legend>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="apiUrl" className="block text-sm font-medium">URL del API de Sincronización</label>
                                <input
                                    type="url"
                                    id="apiUrl"
                                    name="apiUrl"
                                    value={settings.apiUrl}
                                    onChange={handleChange}
                                    placeholder="https://api.ejemplo.com/asistencia"
                                    className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label htmlFor="apiKey" className="block text-sm font-medium">Clave de API Secreta</label>
                                <input
                                    type="password"
                                    id="apiKey"
                                    name="apiKey"
                                    value={settings.apiKey}
                                    onChange={handleChange}
                                    placeholder="••••••••••••••••"
                                    className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>
                    </fieldset>

                     <fieldset className="border p-4 rounded-lg border-border-color">
                         <legend className="px-2 font-semibold">Visualización y Alertas</legend>
                         <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label htmlFor="showMatricula" className="font-medium">Mostrar Columna de Matrícula</label>
                                <input type="checkbox" id="showMatricula" name="showMatricula" checked={settings.showMatricula} onChange={handleChange} className="h-5 w-5 rounded text-primary focus:ring-primary" />
                            </div>
                            <div>
                                <label htmlFor="lowAttendanceThreshold" className="block text-sm font-medium">Umbral de Asistencia Baja (%)</label>
                                <input type="number" id="lowAttendanceThreshold" name="lowAttendanceThreshold" value={settings.lowAttendanceThreshold} onChange={handleChange} min="0" max="100" className="mt-1 w-full p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary" />
                                <p className="text-xs text-text-secondary mt-1">Se marcarán en reportes los alumnos con asistencia por debajo de este porcentaje.</p>
                          </div>
                         </div>
                     </fieldset>

                     <fieldset className="border p-4 rounded-lg border-border-color">
                        <legend className="px-2 font-semibold">Datos y Sincronización</legend>
                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="secondary" onClick={handleExport} className="w-full">
                                <Icon name="download-cloud" /> Exportar Respaldo
                            </Button>
                            <Button variant="secondary" onClick={handleImportClick} className="w-full">
                                <Icon name="upload-cloud" /> Importar Respaldo
                            </Button>
                            <Button variant="secondary" onClick={() => syncAttendanceData(state, dispatch, 'all')} className="w-full">
                                <Icon name="upload-cloud" /> Sinc. Asistencia (Completo)
                            </Button>
                            <Button variant="secondary" onClick={() => syncGradesData(state, dispatch)} className="w-full">
                                <Icon name="graduation-cap" /> Sinc. Calificaciones
                            </Button>
                            <Button variant="secondary" onClick={() => syncScheduleData(state, dispatch)} className="w-full bg-accent text-white hover:opacity-90">
                                <Icon name="download-cloud" /> Actualizar Horario
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".json"
                                className="hidden"
                            />
                        </div>
                        <p className="text-xs text-text-secondary mt-2">
                            <strong className="text-accent-yellow-dark">Importante:</strong> Importar un respaldo reemplazará toda la información actual. Sincronizar el horario agregará o actualizará grupos sin borrar los existentes.
                        </p>
                    </fieldset>
                    
                </div>
                 <div className="flex justify-end gap-3 mt-8">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Cambios</Button>
                </div>
            </Modal>
            
            <SemesterTransitionModal isOpen={isTransitionOpen} onClose={() => setTransitionOpen(false)} />
        </>
    );
};

export default SettingsModal;
