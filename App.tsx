
import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AppContext } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import GroupManagement from './components/GroupManagement';
import AttendanceView from './components/AttendanceView';
import ReportsView from './components/ReportsView';
import GradesView from './components/GradesView';
import ToastContainer from './components/ToastContainer';
import CalendarView from './components/CalendarView';
import UpdateNotification from './components/UpdateNotification';
import MobileUpdateModal from './components/MobileUpdateModal';
import { PROFESSOR_BIRTHDAYS, APP_VERSION } from './constants';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import Icon from './components/icons/Icon';
import BackgroundShapesV2 from './components/common/BackgroundShapesV2';
import { checkForMobileUpdate } from './services/mobileUpdateService';
import { MobileUpdateInfo } from './types';

const App: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const { settings, teacherSchedule, groups, selectedGroupId } = state;
  const [isFriday, setIsFriday] = useState(false);
  const [isBirthday, setIsBirthday] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [mobileUpdateInfo, setMobileUpdateInfo] = useState<MobileUpdateInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Seguimiento de notificaciones enviadas para no repetir
  const notifiedClassesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    
    // Solicitar permiso para notificaciones
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // Lógica de Alerta de Próxima Clase (Configurable)
  useEffect(() => {
    if (!teacherSchedule || teacherSchedule.length === 0 || !settings.enableReminders) return;

    const checkSchedule = () => {
      const now = new Date();
      const currentDayStr = now.toLocaleDateString('es-ES', { weekday: 'long' });
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const currentTimeInMins = currentHour * 60 + currentMin;

      // Buscar clases de hoy
      const todaysClasses = teacherSchedule.filter(c => c.day.toLowerCase() === currentDayStr.toLowerCase());

      todaysClasses.forEach(clase => {
        const classStartInMins = clase.startTime * 60;
        const diff = classStartInMins - currentTimeInMins;
        const notificationKey = `${clase.id}-${now.toDateString()}`;

        // Usar el tiempo configurado en settings
        const reminderTime = settings.reminderTime || 20;

        // Si faltan exactamente o menos que el tiempo configurado (pero más de 0)
        if (diff > 0 && diff <= reminderTime && !notifiedClassesRef.current.has(notificationKey)) {
          if (Notification.permission === "granted") {
            new Notification("🍎 Próxima Clase", {
              body: `Faltan ${diff} min para: ${clase.subjectName} (${clase.groupName})`,
              icon: "logo.png"
            });
            notifiedClassesRef.current.add(notificationKey);
          }
        }
      });
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 60000); // Revisar cada minuto
    return () => clearInterval(interval);
  }, [teacherSchedule, settings.enableReminders, settings.reminderTime]);


  useEffect(() => {
    const checkDate = () => {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const todayStr = `${month}-${day}`;
      const birthday = PROFESSOR_BIRTHDAYS.find(p => p.birthdate === todayStr);
      setIsBirthday(!!birthday);
      setIsFriday(today.getDay() === 5);
    };

    checkDate();
    const timer = setInterval(checkDate, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onUpdateDownloaded(() => {
        setUpdateAvailable(true);
      });
    } 
    else if (settings.mobileUpdateUrl) {
       checkForMobileUpdate(settings.mobileUpdateUrl, APP_VERSION)
         .then(info => {
             if (info) setMobileUpdateInfo(info);
         })
         .catch(err => {
             console.warn("Auto-update check failed:", err);
         });
    }
  }, [settings.mobileUpdateUrl]);

  const handleUpdate = () => {
    if (window.electronAPI) {
      window.electronAPI.restartApp();
    }
  };

  // NAVEGACIÓN POR GESTOS (SWIPES)
  const handleSwipe = useCallback((_: any, info: PanInfo) => {
    if (window.innerWidth >= 768) return; // Solo móvil
    if (groups.length <= 1) return;

    const swipeThreshold = 50;
    const velocityThreshold = 0.5;

    if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold) {
      const currentIndex = groups.findIndex(g => g.id === selectedGroupId);
      if (currentIndex === -1 && selectedGroupId !== null) return;

      if (info.offset.x > 0) {
        // Swipe Right -> Previous Group
        const prevIndex = (currentIndex <= 0) ? groups.length - 1 : currentIndex - 1;
        dispatch({ type: 'SET_SELECTED_GROUP', payload: groups[prevIndex].id });
      } else {
        // Swipe Left -> Next Group
        const nextIndex = (currentIndex >= groups.length - 1 || currentIndex === -1) ? 0 : currentIndex + 1;
        dispatch({ type: 'SET_SELECTED_GROUP', payload: groups[nextIndex].id });
      }
    }
  }, [groups, selectedGroupId, dispatch]);


  const renderView = () => {
    switch (state.activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'groups':
        return <GroupManagement />;
      case 'attendance':
        return <AttendanceView />;
      case 'calendar':
        return <CalendarView />;
      case 'grades':
        return <GradesView />;
      case 'reports':
        return <ReportsView />;
      default:
        return <Dashboard />;
    }
  };
  
  const viewTitles: { [key in typeof state.activeView]: string } = {
    dashboard: 'Inicio',
    groups: 'Grupos',
    attendance: 'Asistencia',
    calendar: 'Calendario',
    grades: 'Calificaciones',
    reports: 'Reportes',
  };

  // Vistas que requieren pantalla completa y scroll interno (como Asistencia)
  const isFullScreenView = state.activeView === 'attendance' || state.activeView === 'grades';

  const showFridayBanner = isFriday && !isBirthday;

  return (
    <div className="flex h-screen bg-background text-text-primary font-sans relative overflow-hidden">
      <BackgroundShapesV2 />
      
      {updateAvailable && <UpdateNotification onUpdate={handleUpdate} />}
      
      <MobileUpdateModal 
         isOpen={!!mobileUpdateInfo} 
         onClose={() => setMobileUpdateInfo(null)} 
         updateInfo={mobileUpdateInfo}
      />
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <AnimatePresence>
        {isSidebarOpen && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 z-20 md:hidden"
            />
        )}
      </AnimatePresence>
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden z-10 relative">
        <header className="flex-shrink-0 relative">
          {showFridayBanner ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
            >
               <button
                  aria-label="Open menu"
                  onClick={() => setIsSidebarOpen(true)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-white/80 hover:bg-white/20 md:hidden"
                >
                    <Icon name="align-justify" className="w-6 h-6"/>
                </button>
              <Icon name="cake" className="w-8 h-8 animate-bounce" />
              <div>
                <p className="font-bold text-lg">¡Es viernes!</p>
                <p>¡Ya casi es momento de descansar, suerte en el día!</p>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center p-4 bg-surface/80 backdrop-blur-sm border-b border-border-color">
              <button
                  aria-label="Open menu"
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1 mr-3 rounded-md text-text-secondary hover:bg-surface-secondary md:hidden"
                >
                  <Icon name="align-justify" className="w-6 h-6"/>
              </button>
              <h1 className="text-2xl font-bold text-primary">
                {viewTitles[state.activeView]}
              </h1>
            </div>
          )}
        </header>
        
        {/* Contenedor principal de la vista - Ajustado para evitar desbordamiento */}
        {/* FIX: Se eliminó el selectedGroupId de la KEY para permitir actualizaciones suaves sin remounting */}
        <motion.div 
            className={`flex-1 flex flex-col min-w-0 ${isFullScreenView ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}
            onPanEnd={handleSwipe}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${state.activeView}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`flex-1 p-3 sm:p-5 lg:p-6 min-h-0 min-w-0 flex flex-col ${isFullScreenView ? 'h-full' : ''}`}
                >
                    {renderView()}
                </motion.div>
            </AnimatePresence>
        </motion.div>
      </main>

      <ToastContainer />
    </div>
  );
};

export default App;
