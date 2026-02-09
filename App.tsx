import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AppContext } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import GroupManagement from './components/GroupManagement';
import TeamsView from './components/TeamsView';
import AttendanceView from './components/AttendanceView';
import ReportsView from './components/ReportsView';
import GradesView from './components/GradesView';
import TutorshipView from './components/TutorshipView';
import ToastContainer from './components/ToastContainer';
import CalendarView from './components/CalendarView';
import UpdateNotification from './components/UpdateNotification';
import MobileUpdateModal from './components/MobileUpdateModal';
import ChangelogModal from './components/ChangelogModal';
import { PROFESSOR_BIRTHDAYS, APP_VERSION } from './constants';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import Icon from './components/icons/Icon';
import BackgroundShapesV2 from './components/common/BackgroundShapesV2';
import { checkForMobileUpdate } from './services/mobileUpdateService';
import { MobileUpdateInfo } from './types';
import useLocalStorage from './hooks/useLocalStorage';

const normalizeStr = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const App: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const { settings, teacherSchedule, groups, selectedGroupId } = state;
  const [isFriday, setIsFriday] = useState(false);
  const [isBirthday, setIsBirthday] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [mobileUpdateInfo, setMobileUpdateInfo] = useState<MobileUpdateInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  
  const [lastSeenVersion, setLastSeenVersion] = useLocalStorage('lastSeenVersion', '0.0.0');

  const notifiedClassesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            console.log("Notificaciones habilitadas por el usuario.");
          }
        });
      }
    }

    if (lastSeenVersion !== APP_VERSION) {
        setIsChangelogOpen(true);
        setLastSeenVersion(APP_VERSION);
    }
  }, []);

  useEffect(() => {
    if (!teacherSchedule || teacherSchedule.length === 0 || !settings.enableReminders) return;

    const checkSchedule = () => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;

      const now = new Date();
      const currentDayStr = normalizeStr(now.toLocaleDateString('es-ES', { weekday: 'long' }));
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const currentTimeInMins = currentHour * 60 + currentMin;

      const todaysClasses = teacherSchedule.filter(c => normalizeStr(c.day) === currentDayStr);

      todaysClasses.forEach(clase => {
        const classStartInMins = clase.startTime * 60;
        const classEndInMins = (clase.startTime + clase.duration) * 60;
        
        const diffToStart = classStartInMins - currentTimeInMins;
        const diffToEnd = classEndInMins - currentTimeInMins;
        
        const todayKey = now.toDateString();
        const startKey = `START-${clase.id}-${todayKey}`;
        const endKey = `END-${clase.id}-${todayKey}`;

        const reminderTime = settings.reminderTime || 20;
        if (diffToStart > 0 && diffToStart <= reminderTime && !notifiedClassesRef.current.has(startKey)) {
           new Notification("🍎 Próxima Clase", {
              body: `Faltan ${diffToStart} min para: ${clase.subjectName} (${clase.groupName})`,
              icon: "logo.png",
              silent: false,
              requireInteraction: true
            });
            notifiedClassesRef.current.add(startKey);
        }

        if (diffToEnd > 0 && diffToEnd <= 5 && !notifiedClassesRef.current.has(endKey)) {
            new Notification("🔔 Fin de Clase", {
              body: `La clase de ${clase.subjectName} está por terminar en 5 minutos.`,
              icon: "logo.png",
              silent: false
            });
            notifiedClassesRef.current.add(endKey);
        }
      });
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 30000);
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

  const handleSwipe = useCallback((_: any, info: PanInfo) => {
    if (window.innerWidth >= 768) return;
    if (groups.length <= 1) return;

    const swipeThreshold = 50;
    const velocityThreshold = 0.5;

    if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold) {
      const currentIndex = groups.findIndex(g => g.id === selectedGroupId);
      if (currentIndex === -1 && selectedGroupId !== null) return;

      if (info.offset.x > 0) {
        const prevIndex = (currentIndex <= 0) ? groups.length - 1 : currentIndex - 1;
        dispatch({ type: 'SET_SELECTED_GROUP', payload: groups[prevIndex].id });
      } else {
        const nextIndex = (currentIndex >= groups.length - 1 || currentIndex === -1) ? 0 : currentIndex + 1;
        dispatch({ type: 'SET_SELECTED_GROUP', payload: groups[nextIndex].id });
      }
    }
  }, [groups, selectedGroupId, dispatch]);


  const renderView = () => {
    switch (state.activeView) {
      case 'dashboard': return <Dashboard />;
      case 'groups': return <GroupManagement />;
      case 'teams': return <TeamsView />;
      case 'attendance': return <AttendanceView />;
      case 'calendar': return <CalendarView />;
      case 'grades': return <GradesView />;
      case 'reports': return <ReportsView />;
      case 'tutorship': return <TutorshipView />;
      default: return <Dashboard />;
    }
  };
  
  const viewTitles: { [key in typeof state.activeView]: string } = {
    dashboard: 'Inicio',
    groups: 'Grupos',
    teams: 'Equipos',
    attendance: 'Asistencia',
    calendar: 'Calendario',
    grades: 'Calificaciones',
    reports: 'Reportes',
    tutorship: 'Tutoreo'
  };

  const isFullScreenView = state.activeView === 'attendance' || state.activeView === 'grades' || state.activeView === 'teams';
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

      <ChangelogModal 
        isOpen={isChangelogOpen} 
        onClose={() => setIsChangelogOpen(false)} 
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
              <div className="ml-3">
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
                    className={`flex-1 p-3 sm:p-5 lg:p-6 min-h-0 min-w-0 flex flex-col ${isFullScreenView ? 'h-full' : 'pb-10'}`}
                >
                    {renderView()}
                    
                    {/* GLOBAL FOOTER: Se integra al flujo de scroll si NO es vista de pantalla completa */}
                    {!isFullScreenView && (
                        <footer className="mt-12 shrink-0 p-4 text-center">
                           <div className="max-w-4xl mx-auto space-y-1.5 opacity-60">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                 © 2026 Juan Carlos Salgado Robles. Todos los derechos reservados.
                              </p>
                              <p className="text-[8px] text-slate-400 leading-tight italic">
                                 Desarrollado por Juan Carlos Salgado Robles. Uso autorizado bajo licencia exclusiva para la Universidad Politécnica de Santa Rosa Jáuregui. Prohibida su distribución externa sin consentimiento por escrito del autor.
                              </p>
                           </div>
                        </footer>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* MINIMAL FOOTER: Solo para vistas de pantalla completa para no estorbar la vision */}
            {isFullScreenView && (
                <footer className="shrink-0 py-1 px-4 text-center border-t border-border-color bg-surface/30 backdrop-blur-md">
                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate">
                      © 2026 Juan Carlos Salgado Robles • UPSRJ Licencia Exclusiva
                   </p>
                </footer>
            )}
        </motion.div>
      </main>

      <ToastContainer />
    </div>
  );
};

export default App;