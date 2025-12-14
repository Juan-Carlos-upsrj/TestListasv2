
import React, { useContext, useEffect, useState } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './components/icons/Icon';
import BackgroundShapesV2 from './components/common/BackgroundShapesV2';
import { checkForMobileUpdate } from './services/mobileUpdateService';
import { MobileUpdateInfo } from './types';

const App: React.FC = () => {
  const { state } = useContext(AppContext);
  const { settings } = state;
  const [isFriday, setIsFriday] = useState(false);
  const [isBirthday, setIsBirthday] = useState(false);
  
  // Desktop Updates
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  // Mobile Updates
  const [mobileUpdateInfo, setMobileUpdateInfo] = useState<MobileUpdateInfo | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Simple Theme management (Dark/Light only)
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);


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

  // Update listeners (Desktop & Mobile)
  useEffect(() => {
    // 1. Desktop (Electron) check
    if (window.electronAPI) {
      window.electronAPI.onUpdateDownloaded(() => {
        setUpdateAvailable(true);
      });
    } 
    // 2. Mobile (Web/Android) check
    else if (settings.mobileUpdateUrl) {
       // Perform check once on mount (or when URL changes)
       checkForMobileUpdate(settings.mobileUpdateUrl, APP_VERSION)
         .then(info => {
             if (info) setMobileUpdateInfo(info);
         })
         .catch(err => {
             // Silently fail on auto-check to avoid annoying the user on startup
             console.warn("Auto-update check failed:", err);
         });
    }
  }, [settings.mobileUpdateUrl]);

  const handleUpdate = () => {
    if (window.electronAPI) {
      window.electronAPI.restartApp();
    }
  };


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

  const showFridayBanner = isFriday && !isBirthday;

  return (
    <div className="flex h-screen bg-background text-text-primary font-sans relative">
      <BackgroundShapesV2 />
      
      {/* Desktop Notification */}
      {updateAvailable && <UpdateNotification onUpdate={handleUpdate} />}
      
      {/* Mobile/Manual Modal */}
      <MobileUpdateModal 
         isOpen={!!mobileUpdateInfo} 
         onClose={() => setMobileUpdateInfo(null)} 
         updateInfo={mobileUpdateInfo}
      />
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Overlay for mobile */}
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
      
      <main className="flex-1 flex flex-col overflow-hidden z-10 relative">
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
              <Icon name="cake" className="w-8 h-8 animate-pulse" />
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {renderView()}
        </div>
      </main>

      <ToastContainer />
    </div>
  );
};

export default App;
