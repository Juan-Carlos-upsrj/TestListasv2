
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

const ProgressCircle: React.FC<{ percent: number }> = ({ percent }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
        <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
                <circle
                    cx="40" cy="40" r={radius}
                    stroke="currentColor" strokeWidth="6" fill="transparent"
                    className="text-slate-200 dark:text-slate-700"
                />
                <circle
                    cx="40" cy="40" r={radius}
                    stroke="currentColor" strokeWidth="6" fill="transparent"
                    strokeDasharray={circumference}
                    style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                    className="text-indigo-600"
                    strokeLinecap="round"
                />
            </svg>
            <span className="absolute text-xs font-black text-indigo-700">{Math.round(percent)}%</span>
        </div>
    );
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { state, dispatch } = useContext(AppContext);
    const [settings, setSettings] = useState<Settings>(state.settings);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [updateStatus, setUpdateStatus] = useState<string>('');
    const [downloadPercent, setDownloadPercent] = useState<number>(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [isTransitionOpen, setTransitionOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('sistema');

    const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
    const [pendingRestoreArchive, setPendingRestoreArchive] = useState<Archive | null>(null);
    const [pendingDeleteArchive, setPendingDeleteArchive] = useState<Archive | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSettings(state.settings);
    }, [state.settings, isOpen]);
    
    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.onUpdateAvailable(() => {
                setUpdateStatus('Nueva versión disponible...');
                setIsDownloading(true);
                setIsChecking(false);
            });
            window.electronAPI.onDownloadProgress((percent) => {
                setDownloadPercent(percent);
            });
            window.electronAPI.onUpdateNotAvailable(() => {
                setUpdateStatus('Versión al día.');
                setIsChecking(false);
            });
            window.electronAPI.onUpdateError((msg) => {
                setUpdateStatus(`Error: ${msg}`);
                setIsChecking(false);
                setIsDownloading(false);
            });
            window.electronAPI.onUpdateDownloaded(() => {
                setUpdateStatus('Descarga lista. Reinicia.');
                setIsDownloading(false);
                setDownloadPercent(100);
            });
        }
    }, []);

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const element = document.getElementById(`settings-sec-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: string | number | boolean = value;
        if (type === 'checkbox') finalValue = (e.target as HTMLInputElement).checked;
        else if (type === 'number') finalValue = Number(value);
        setSettings(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSave = () => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Configuración guardada.', type: 'success' } });
        onClose();
    };

    const handleExport = () => exportBackup(state);
    const handleImportClick = () => fileInputRef.current?.click();
    
    const handleCheckForUpdates = async () => {
        setIsChecking(true);
        setUpdateStatus('Buscando...');
        if (window.electronAPI) {
            window.electronAPI.checkForUpdates();
        } else if (settings.mobileUpdateUrl) {
            try {
                const updateInfo = await checkForMobileUpdate(settings.mobileUpdateUrl, APP_VERSION);
                setUpdateStatus(updateInfo ? `¡Nueva v${updateInfo.version}!` : 'Al día.');
            } catch (e) {
                setUpdateStatus('Error al buscar');
            }
            setIsChecking(false);
        }
    };

    const confirmImportAction = async () => {
        if (pendingImportFile) {
            try {
                const importedData = await importBackup(pendingImportFile);
                dispatch({ type: 'SET_INITIAL_STATE', payload: importedData });
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Importado con éxito.', type: 'success' } });
                onClose();
            } catch (error) {
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al importar.', type: 'error' } });
            }
            setPendingImportFile(null);
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

    const navItems = [
        { id: 'sistema', label: 'Actualización', icon: 'download-cloud' },
        { id: 'nube', label: 'Conexión Nube', icon: 'upload-cloud' },
        { id: 'calendario', label: 'Google Calendar', icon: 'calendar' },
        { id: 'periodo', label: 'Ciclo Escolar', icon: 'graduation-cap' },
        { id: 'historial', label: 'Historial', icon: 'list-checks', show: state.archives.length > 0 },
        { id: 'preferencias', label: 'Preferencias', icon: 'settings' },
        { id: 'respaldo', label: 'Seguridad', icon: 'layout' },
    ];

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Gestión Académica - Configuración" size="7xl">
                <div className="flex h-[75vh] -m-6 overflow-hidden">
                    {/* MINI VENTANA IZQUIERDA (Navegación) */}
                    <div className="w-64 bg-slate-50 dark:bg-slate-900/50 border-r border-border-color flex flex-col shrink-0">
                        <div className="p-6 text-center border-b border-border-color">
                            <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-200">
                                <span className="text-2xl font-black">{settings.professorName.charAt(0)}</span>
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm px-2">
                                {settings.professorName}
                            </h3>
                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1">Docente IAEV</p>
                        </div>
                        
                        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                            {navItems.filter(i => i.show !== false).map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollToSection(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                                        activeSection === item.id 
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                    }`}
                                >
                                    <Icon name={item.icon} className="w-4 h-4" />
                                    {item.label}
                                </button>
                            ))}
                        </nav>

                        <div className="p-4 border-t border-border-color">
                             <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl">
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter mb-1 text-center">Version Build</p>
                                <p className="text-center font-black text-indigo-700 dark:text-indigo-400">v{APP_VERSION}</p>
                             </div>
                        </div>
                    </div>

                    {/* CONTENIDO DERECHA (Formularios) */}
                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
                        
                        {/* SECCIÓN: SISTEMA */}
                        <section id="settings-sec-sistema" className="space-y-6">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <Icon name="download-cloud" className="w-5 h-5 text-indigo-600" />
                                <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Sistema y Actualización</h4>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-8">
                                {isDownloading ? (
                                    <ProgressCircle percent={downloadPercent} />
                                ) : (
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border-4 border-slate-100">
                                        <Icon name="check-circle-2" className="w-10 h-10 text-emerald-500" />
                                    </div>
                                )}
                                <div className="flex-1 text-center sm:text-left">
                                    <p className="font-black text-slate-800 dark:text-slate-100 uppercase text-xs tracking-wider mb-1">Estado de Versión</p>
                                    <p className="text-sm text-slate-500 mb-4">{updateStatus || 'Buscando novedades en el servidor...'}</p>
                                    <Button size="sm" onClick={handleCheckForUpdates} disabled={isChecking || isDownloading}>
                                        {isChecking ? 'Verificando...' : 'Verificar Ahora'}
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4">
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase text-slate-400 ml-1">Repositorio GitHub</span>
                                    <input type="url" name="mobileUpdateUrl" value={settings.mobileUpdateUrl} onChange={handleChange} className="mt-1 w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white transition-all text-sm font-bold" />
                                </label>
                            </div>
                        </section>

                        {/* SECCIÓN: NUBE */}
                        <section id="settings-sec-nube" className="space-y-6 pt-6">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <Icon name="upload-cloud" className="w-5 h-5 text-indigo-600" />
                                <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Conexión a la Nube (API)</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase text-slate-400 ml-1">URL api.php</span>
                                    <input type="url" name="apiUrl" value={settings.apiUrl} onChange={handleChange} className="mt-1 w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold" />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase text-slate-400 ml-1">X-API-KEY</span>
                                    <input type="password" name="apiKey" value={settings.apiKey} onChange={handleChange} className="mt-1 w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold" />
                                </label>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={() => syncAttendanceData(state, dispatch, 'all')} className="flex-1 text-xs">Sinc. Asistencias</Button>
                                <Button variant="secondary" onClick={() => syncScheduleData(state, dispatch)} className="flex-1 text-xs bg-indigo-600 text-white border-none">Actualizar Horario</Button>
                            </div>
                        </section>

                        {/* SECCIÓN: CALENDARIO */}
                        <section id="settings-sec-calendario" className="space-y-6 pt-6">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <Icon name="calendar" className="w-5 h-5 text-indigo-600" />
                                <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Google Calendar (iCal)</h4>
                            </div>
                            <input type="url" name="googleCalendarUrl" value={settings.googleCalendarUrl} onChange={handleChange} placeholder="https://..." className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold" />
                            <div className="flex flex-wrap gap-2">
                                {GROUP_COLORS.slice(0, 12).map(c => (
                                    <button key={c.name} onClick={() => setSettings(p => ({ ...p, googleCalendarColor: c.name }))} className={`w-8 h-8 rounded-full border-2 transition-all ${c.bg} ${settings.googleCalendarColor === c.name ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-40'}`} />
                                ))}
                            </div>
                        </section>

                        {/* SECCIÓN: DOCENCIA */}
                        <section id="settings-sec-periodo" className="space-y-6 pt-6">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <Icon name="graduation-cap" className="w-5 h-5 text-indigo-600" />
                                <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Periodo y Docencia</h4>
                            </div>
                            <label className="block">
                                <span className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre Completo</span>
                                <input type="text" name="professorName" value={settings.professorName} onChange={handleChange} className="mt-1 w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-black" />
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase text-slate-400 ml-1">Inicio Semestre</span>
                                    <input type="date" name="semesterStart" value={settings.semesterStart} onChange={handleChange} className="mt-1 w-full p-2 border-2 border-slate-100 rounded-xl bg-slate-50 text-sm" />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase text-slate-400 ml-1">Fin Semestre</span>
                                    <input type="date" name="semesterEnd" value={settings.semesterEnd} onChange={handleChange} className="mt-1 w-full p-2 border-2 border-slate-100 rounded-xl bg-slate-50 text-sm" />
                                </label>
                            </div>
                            <Button onClick={() => setTransitionOpen(true)} className="w-full bg-rose-600 text-white border-none py-3 shadow-lg shadow-rose-200">
                                <Icon name="users" className="w-4 h-4"/> Asistente de Cierre de Ciclo
                            </Button>
                        </section>

                        {/* SECCIÓN: HISTORIAL */}
                        {state.archives.length > 0 && (
                            <section id="settings-sec-historial" className="space-y-4 pt-6">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Icon name="list-checks" className="w-5 h-5 text-indigo-600" />
                                    <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Historial de Ciclos</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {state.archives.map(archive => (
                                        <div key={archive.id} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between">
                                            <div className="min-w-0">
                                                <p className="text-xs font-black truncate text-slate-700 uppercase">{archive.name}</p>
                                                <p className="text-[9px] text-slate-400">{new Date(archive.dateArchived).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                <button onClick={() => setPendingRestoreArchive(archive)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Icon name="upload-cloud" className="w-4 h-4"/></button>
                                                <button onClick={() => setPendingDeleteArchive(archive)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Icon name="trash-2" className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                         {/* SECCIÓN: PREFERENCIAS */}
                        <section id="settings-sec-preferencias" className="space-y-6 pt-6">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <Icon name="settings" className="w-5 h-5 text-indigo-600" />
                                <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Preferencias Visuales</h4>
                            </div>
                            <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700">Mostrar Matrícula en Tablas</span>
                                    <input type="checkbox" name="showMatricula" checked={settings.showMatricula} onChange={handleChange} className="h-6 w-11 rounded-full text-indigo-600 border-2" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700">Recordatorios de Clase</span>
                                    <input type="checkbox" name="enableReminders" checked={settings.enableReminders} onChange={handleChange} className="h-6 w-11 rounded-full text-indigo-600 border-2" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700">Anticipación Notificación (min)</span>
                                    <input type="number" name="reminderTime" value={settings.reminderTime} onChange={handleChange} className="w-20 p-2 border-2 border-slate-200 rounded-xl bg-white text-xs font-bold text-center" />
                                </div>
                            </div>
                        </section>

                        {/* SECCIÓN: RESPALDO */}
                        <section id="settings-sec-respaldo" className="space-y-6 pt-6 mb-10">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <Icon name="layout" className="w-5 h-5 text-indigo-600" />
                                <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Respaldo Local</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Button variant="secondary" onClick={handleExport} className="w-full bg-white text-slate-700 py-4"><Icon name="download-cloud" className="w-5 h-5"/> Exportar JSON</Button>
                                <Button variant="secondary" onClick={handleImportClick} className="w-full bg-white text-slate-700 py-4"><Icon name="upload-cloud" className="w-5 h-5"/> Importar JSON</Button>
                                <input type="file" ref={fileInputRef} onChange={(e) => setPendingImportFile(e.target.files?.[0] || null)} accept=".json" className="hidden" />
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer Modal con botones de acción global */}
                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border-color">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} className="px-8 shadow-lg shadow-indigo-100">Guardar Cambios</Button>
                </div>
            </Modal>
            
            <SemesterTransitionModal isOpen={isTransitionOpen} onClose={() => setTransitionOpen(false)} />

            <ConfirmationModal
                isOpen={!!pendingImportFile}
                onClose={() => setPendingImportFile(null)}
                onConfirm={confirmImportAction}
                title="Sustitución de Datos"
                variant="danger"
            >
                Vas a reemplazar toda la información actual por el archivo seleccionado. <b>Esta acción es irreversible.</b>
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={!!pendingRestoreArchive}
                onClose={() => setPendingRestoreArchive(null)}
                onConfirm={confirmRestoreAction}
                title="Restauración de Ciclo"
                variant="danger"
            >
                ¿Cargar los datos de <b>{pendingRestoreArchive?.name}</b>? Los datos que tienes actualmente en pantalla se perderán si no hiciste respaldo.
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={!!pendingDeleteArchive}
                onClose={() => setPendingDeleteArchive(null)}
                onConfirm={confirmDeleteArchiveAction}
                title="Eliminar del Historial"
                variant="danger"
            >
                ¿Borrar permanentemente el archivo <b>{pendingDeleteArchive?.name}</b>?
            </ConfirmationModal>
        </>
    );
};

export default SettingsModal;
