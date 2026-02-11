import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { Settings, Archive } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import ConfirmationModal from './common/ConfirmationModal';
import { APP_VERSION, GROUP_COLORS } from '../constants';
import { exportBackup, importBackup } from '../services/backupService';
import Icon from './icons/Icon';
import { syncAttendanceData, syncScheduleData, syncGradesData } from '../services/syncService';
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
    const [activeSection, setActiveSection] = useState('periodo');

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
        { id: 'periodo', label: 'Periodo y Docencia', icon: 'graduation-cap' },
        { id: 'nube', label: 'Conexión Nube', icon: 'upload-cloud' },
        { id: 'sistema', label: 'Actualización', icon: 'download-cloud' },
        { id: 'calendario', label: 'Google Calendar', icon: 'calendar' },
        { id: 'historial', label: 'Historial', icon: 'list-checks', show: state.archives.length > 0 },
        { id: 'preferencias', label: 'Preferencias', icon: 'settings' },
        { id: 'respaldo', label: 'Seguridad', icon: 'layout' },
    ];

    const HeaderActions = (
        <Button onClick={handleSave} size="sm" className="shadow-lg shadow-indigo-100 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Icon name="check-circle-2" className="w-4 h-4" />
            <span className="hidden sm:inline">Guardar Configuración</span>
            <span className="sm:hidden">Guardar</span>
        </Button>
    );

    return (
        <>
            <Modal 
                isOpen={isOpen} 
                onClose={onClose} 
                title="Configuración" 
                size="7xl"
                headerActions={HeaderActions}
            >
                <div className="flex h-[82vh] -m-6 overflow-hidden bg-background">
                    {/* MINI VENTANA IZQUIERDA (Acciones Rápidas ARRIBA + Navegación) */}
                    <div className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-border-color flex flex-col shrink-0">
                        <div className="p-6 text-center border-b border-border-color">
                            <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-200 ring-4 ring-white">
                                <span className="text-2xl font-black">{settings.professorName.charAt(0)}</span>
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm px-2">
                                {settings.professorName}
                            </h3>
                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1">Docente IAEV</p>
                        </div>
                        
                        <nav className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {/* CATEGORÍA: ACCIONES RÁPIDAS */}
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2 ml-2">Inicio de Cuatri</p>
                                    <button onClick={() => syncScheduleData(state, dispatch)} className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black transition-colors uppercase border border-blue-100 shadow-sm">
                                        <Icon name="calendar" className="w-3.5 h-3.5" /> Cargar Horario
                                    </button>
                                </div>

                                <div>
                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2 ml-2">Sincronización Nube</p>
                                    <div className="space-y-2">
                                        <button onClick={() => syncAttendanceData(state, dispatch, 'all')} className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black transition-colors uppercase border border-indigo-100 shadow-sm">
                                            <Icon name="upload-cloud" className="w-3.5 h-3.5" /> Subir Asistencias
                                        </button>
                                        <button onClick={() => syncGradesData(state, dispatch)} className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black transition-colors uppercase border border-emerald-100 shadow-sm">
                                            <Icon name="graduation-cap" className="w-3.5 h-3.5" /> Subir Califics.
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-2 ml-2">Fin de Cuatri</p>
                                    <button onClick={() => setTransitionOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black transition-colors uppercase border border-rose-100 shadow-sm">
                                        <Icon name="users" className="w-3.5 h-3.5" /> Asistente Fin Ciclo
                                    </button>
                                </div>
                            </div>

                            {/* CATEGORÍA: NAVEGACIÓN */}
                            <div className="pt-4 border-t border-slate-200">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Secciones</p>
                                {navItems.filter(i => i.show !== false).map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                            activeSection === item.id 
                                            ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                                            : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <Icon name={item.icon} className="w-4 h-4" />
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </nav>

                        <div className="p-4 border-t border-border-color bg-slate-100/50">
                             <div className="flex gap-2">
                                <button onClick={handleExport} className="flex-1 p-2 bg-white text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center shadow-sm" title="Exportar JSON"><Icon name="download-cloud" className="w-4 h-4"/></button>
                                <button onClick={handleImportClick} className="flex-1 p-2 bg-white text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center shadow-sm" title="Importar JSON"><Icon name="upload-cloud" className="w-4 h-4"/></button>
                                <input type="file" ref={fileInputRef} onChange={(e) => setPendingImportFile(e.target.files?.[0] || null)} accept=".json" className="hidden" />
                             </div>
                             <p className="text-center font-black text-slate-400 text-[10px] mt-3">BUILD v{APP_VERSION}</p>
                        </div>
                    </div>

                    {/* CONTENIDO DERECHA (Formularios en Rejilla de 2 Columnas) */}
                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-slate-900/20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-12 content-start">
                            
                            {/* SECCIÓN: PERIODO Y DOCENCIA */}
                            <section id="settings-sec-periodo" className="space-y-6 lg:col-span-2">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Icon name="graduation-cap" className="w-5 h-5 text-indigo-600" />
                                    <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Periodo y Docencia</h4>
                                </div>
                                
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[11px] font-black uppercase text-slate-400 ml-1 mb-1.5">Nombre del docente:</label>
                                            <input type="text" name="professorName" value={settings.professorName} onChange={handleChange} className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm font-black text-indigo-700" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black uppercase text-slate-400 ml-1 mb-1.5">Inicio de Cuatrimestre:</label>
                                            <input type="date" name="semesterStart" value={settings.semesterStart} onChange={handleChange} className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm font-bold" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                                            <label className="block text-[11px] font-black uppercase text-indigo-600 ml-1 mb-2">Evaluación De primer parcial:</label>
                                            <div className="flex items-center gap-2">
                                                <input type="date" name="p1EvalStart" value={settings.p1EvalStart} onChange={handleChange} className="w-full p-2 border-2 border-slate-100 rounded-lg bg-slate-50 text-xs font-bold" />
                                                <span className="text-slate-400 font-black">—</span>
                                                <input type="date" name="p1EvalEnd" value={settings.p1EvalEnd} onChange={handleChange} className="w-full p-2 border-2 border-indigo-200 rounded-lg bg-indigo-50 text-xs font-black text-indigo-700" />
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                                            <label className="block text-[11px] font-black uppercase text-blue-600 ml-1 mb-2">Evaluación De Segundo Parcial:</label>
                                            <div className="flex items-center gap-2">
                                                <input type="date" name="p2EvalStart" value={settings.p2EvalStart} onChange={handleChange} className="w-full p-2 border-2 border-slate-100 rounded-lg bg-slate-50 text-xs font-bold" />
                                                <span className="text-slate-400 font-black">—</span>
                                                <input type="date" name="p2EvalEnd" value={settings.p2EvalEnd} onChange={handleChange} className="w-full p-2 border-2 border-blue-200 rounded-lg bg-blue-50 text-xs font-black text-blue-700" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-400 ml-1 mb-1.5">Fin de Cuatrimestre:</label>
                                        <input type="date" name="semesterEnd" value={settings.semesterEnd} onChange={handleChange} className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm font-bold" />
                                    </div>
                                </div>
                            </section>

                            {/* SECCIÓN: NUBE */}
                            <section id="settings-sec-nube" className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Icon name="upload-cloud" className="w-5 h-5 text-indigo-600" />
                                    <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Conexión a la Nube</h4>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
                                    <label className="block">
                                        <span className="text-[10px] font-black uppercase text-slate-400 ml-1">URL api.php</span>
                                        <input type="url" name="apiUrl" value={settings.apiUrl} onChange={handleChange} className="mt-1 w-full p-2.5 border-2 border-slate-100 rounded-xl bg-white text-sm font-bold" />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-black uppercase text-slate-400 ml-1">X-API-KEY</span>
                                        <input type="password" name="apiKey" value={settings.apiKey} onChange={handleChange} className="mt-1 w-full p-2.5 border-2 border-slate-100 rounded-xl bg-white text-sm font-bold" />
                                    </label>
                                </div>
                            </section>

                            {/* SECCIÓN: SISTEMA */}
                            <section id="settings-sec-sistema" className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Icon name="download-cloud" className="w-5 h-5 text-indigo-600" />
                                    <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Sistema</h4>
                                </div>
                                
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6">
                                    {isDownloading ? (
                                        <ProgressCircle percent={downloadPercent} />
                                    ) : (
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-slate-100 shadow-inner shrink-0">
                                            <Icon name="check-circle-2" className="w-8 h-8 text-emerald-500" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="font-black text-slate-800 dark:text-slate-100 uppercase text-[10px] tracking-wider mb-1">Actualización</p>
                                        <p className="text-xs text-slate-500 mb-2 truncate">{updateStatus || 'Servidor disponible.'}</p>
                                        <Button size="sm" onClick={handleCheckForUpdates} disabled={isChecking || isDownloading} className="!py-1 !px-3 !text-xs">
                                            {isChecking ? 'Verificando...' : 'Revisar Ahora'}
                                        </Button>
                                    </div>
                                </div>
                                {!window.electronAPI && (
                                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 mt-2 shadow-sm">
                                        <label className="block">
                                            <span className="text-[10px] font-black uppercase text-slate-400 ml-1">Repositorio GitHub</span>
                                            <input type="url" name="mobileUpdateUrl" value={settings.mobileUpdateUrl} onChange={handleChange} className="mt-1 w-full p-2.5 border-2 border-slate-100 rounded-xl bg-white text-xs font-bold" />
                                        </label>
                                    </div>
                                )}
                            </section>

                            {/* SECCIÓN: CALENDARIO */}
                            <section id="settings-sec-calendario" className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Icon name="calendar" className="w-5 h-5 text-indigo-600" />
                                    <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Google Calendar</h4>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
                                    <input type="url" name="googleCalendarUrl" value={settings.googleCalendarUrl} onChange={handleChange} placeholder="https://calendar.google.com/..." className="w-full p-2.5 border-2 border-slate-100 rounded-xl bg-white text-xs font-bold" />
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {GROUP_COLORS.slice(0, 12).map(c => (
                                            <button key={c.name} onClick={() => setSettings(p => ({ ...p, googleCalendarColor: c.name }))} className={`w-7 h-7 rounded-full border-2 transition-all ${c.bg} ${settings.googleCalendarColor === c.name ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-40 hover:opacity-100'}`} />
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* SECCIÓN: PREFERENCIAS */}
                            <section id="settings-sec-preferencias" className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Icon name="settings" className="w-5 h-5 text-indigo-600" />
                                    <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Preferencias</h4>
                                </div>
                                <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-700">Reprobación por Faltas</span>
                                            <span className="text-[9px] text-slate-400">¿Las bajas de asistencia reprueban al alumno?</span>
                                        </div>
                                        <input type="checkbox" name="failByAttendance" checked={settings.failByAttendance} onChange={handleChange} className="h-5 w-10 rounded-full text-indigo-600 border-2" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700">Matrícula en Tablas</span>
                                        <input type="checkbox" name="showMatricula" checked={settings.showMatricula} onChange={handleChange} className="h-5 w-10 rounded-full text-indigo-600 border-2" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700">Recordatorios de Clase</span>
                                        <input type="checkbox" name="enableReminders" checked={settings.enableReminders} onChange={handleChange} className="h-5 w-10 rounded-full text-indigo-600 border-2" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700">Anticipación (min)</span>
                                        <input type="number" name="reminderTime" value={settings.reminderTime} onChange={handleChange} className="w-16 p-1.5 border-2 border-slate-200 rounded-xl bg-white text-xs font-bold text-center" />
                                    </div>
                                </div>
                            </section>

                            {/* SECCIÓN: HISTORIAL */}
                            {state.archives.length > 0 && (
                                <section id="settings-sec-historial" className="space-y-4 lg:col-span-2">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                        <Icon name="list-checks" className="w-5 h-5 text-indigo-600" />
                                        <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Historial de Ciclos</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {state.archives.map(archive => (
                                            <div key={archive.id} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black truncate text-slate-700 uppercase">{archive.name}</p>
                                                    <p className="text-[9px] text-slate-400">{new Date(archive.dateArchived).toLocaleDateString()}</p>
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <button onClick={() => setPendingRestoreArchive(archive)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Restaurar"><Icon name="upload-cloud" className="w-4 h-4"/></button>
                                                    <button onClick={() => setPendingDeleteArchive(archive)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar"><Icon name="trash-2" className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* SECCIÓN: RESPALDO */}
                            <section id="settings-sec-respaldo" className="space-y-4 lg:col-span-2 mb-10">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Icon name="layout" className="w-5 h-5 text-indigo-600" />
                                    <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Seguridad de Datos</h4>
                                </div>
                                <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 shadow-sm">
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        <div className="flex-1">
                                            <p className="text-xs text-rose-800 font-bold mb-1">Manejo manual de datos</p>
                                            <p className="text-[10px] text-rose-700/70">Exporta o importa el archivo maestro .JSON para transferir tu información.</p>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <Button variant="secondary" onClick={handleExport} className="flex-1 bg-white text-slate-700 !py-2 !px-4 !text-xs shadow-sm border-slate-200 hover:border-indigo-300 transition-all"><Icon name="download-cloud" className="w-4 h-4"/> Exportar</Button>
                                            <Button variant="secondary" onClick={handleImportClick} className="flex-1 bg-white text-slate-700 !py-2 !px-4 !text-xs shadow-sm border-slate-200 hover:border-indigo-300 transition-all"><Icon name="upload-cloud" className="w-4 h-4"/> Importar</Button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
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
                ¿Cargar los datos de <b>{pendingRestoreArchive?.name}</b>? Los datos actuales se perderán sin respaldo.
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