import React, { useContext, useState, useEffect, SetStateAction } from 'react';
import { AppContext } from '../context/AppContext';
import SettingsModal from './SettingsModal';
import Icon from './icons/Icon';
import { motion } from 'framer-motion';
import { ActiveView } from '../types';
import { GROUP_COLORS } from '../constants';
import { startTour } from '../services/tourService';
import useLocalStorage from '../hooks/useLocalStorage';

type View = ActiveView;

const navItems: { view: View; label: string; icon: string; id: string }[] = [
  { view: 'dashboard', label: 'Inicio', icon: 'home', id: 'nav-item-dashboard' },
  { view: 'groups', label: 'Grupos', icon: 'users', id: 'nav-item-groups' },
  { view: 'attendance', label: 'Asistencia', icon: 'check-square', id: 'nav-item-attendance' },
  { view: 'calendar', label: 'Calendario', icon: 'calendar', id: 'nav-item-calendar' },
  { view: 'grades', label: 'Calificaciones', icon: 'graduation-cap', id: 'nav-item-grades' },
  { view: 'reports', label: 'Reportes', icon: 'bar-chart-3', id: 'nav-item-reports' },
];

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: React.Dispatch<SetStateAction<boolean>>;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { state, dispatch } = useContext(AppContext);
  const { groups, selectedGroupId } = state;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  
  // State for collapsible mode (desktop only logic)
  const [isCollapsed, setIsCollapsed] = useLocalStorage('sidebarCollapsed', false);

  useEffect(() => {
    if (window.electronAPI) {
        window.electronAPI.getVersion().then(setAppVersion);
    }
  }, []);

  const handleNavClick = (view: View) => {
    dispatch({ type: 'SET_VIEW', payload: view });
    if (window.innerWidth < 768) { // md breakpoint
        setIsOpen(false);
    }
  };
  
  const handleGroupClick = (groupId: string) => {
    dispatch({ type: 'SET_SELECTED_GROUP', payload: groupId });
    if (window.innerWidth < 768) { // md breakpoint
        setIsOpen(false);
    }
  };

  const toggleCollapse = () => {
      setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      <aside 
        className={`fixed inset-y-0 left-0 bg-surface flex flex-col z-30 border-r border-border-color transition-all duration-300 ease-in-out md:relative md:translate-x-0 md:flex-shrink-0 ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64`}
        aria-label="Barra lateral principal" 
        id="sidebar-main"
      >
        {/* Toggle Button (Desktop Only) */}
        <button 
            onClick={toggleCollapse}
            className="hidden md:flex absolute -right-3 top-20 bg-surface border border-border-color rounded-full p-1 text-text-secondary hover:text-primary shadow-sm z-40"
            title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        >
            <Icon name={isCollapsed ? 'chevron-right' : 'chevron-left'} className="w-4 h-4" />
        </button>

        <div className={`p-4 border-b border-border-color flex items-center gap-3 h-[73px] ${isCollapsed ? 'justify-center' : ''}`} id="sidebar-logo">
            <motion.img 
                src="logo.png" 
                alt="IAEV Logo" 
                className="w-10 h-10 flex-shrink-0"
                animate={{ rotate: [0, 7, -7, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            {!isCollapsed && (
                <motion.h1 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 whitespace-nowrap overflow-hidden"
                >
                    Gestión IAEV
                </motion.h1>
            )}
        </div>
        
        {/* Quick Group Selector Buttons */}
        <div className={`p-4 border-b border-border-color ${isCollapsed ? 'flex flex-col items-center' : ''}`} id="sidebar-quick-groups">
            {!isCollapsed && <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Grupos Rápidos</h3>}
            
            {groups.length > 0 ? (
                <div className={`flex flex-wrap gap-2 ${isCollapsed ? 'justify-center flex-col w-full' : ''}`}>
                    {groups.map(g => {
                        const colorObj = GROUP_COLORS.find(c => c.name === g.color) || GROUP_COLORS[0];
                        const isActive = selectedGroupId === g.id;
                        
                        const activeClass = `${colorObj.bg} !text-white shadow-md ring-2 ring-offset-1 ring-offset-surface ${colorObj.ring || 'ring-primary'}`;
                        const inactiveClass = `bg-surface-secondary text-text-secondary hover:bg-border-color hover:text-text-primary`;

                        if (isCollapsed) {
                            // Collapsed view: Color dots with first letter
                            return (
                                <motion.button
                                    key={g.id}
                                    onClick={() => handleGroupClick(g.id)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    title={g.name}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border border-transparent mx-auto ${
                                        isActive ? activeClass : inactiveClass
                                    }`}
                                >
                                    {g.name.charAt(0).toUpperCase()}
                                </motion.button>
                            );
                        }

                        return (
                            <motion.button
                                key={g.id}
                                onClick={() => handleGroupClick(g.id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 border border-transparent ${
                                    isActive ? activeClass : inactiveClass
                                }`}
                            >
                                {g.name}
                            </motion.button>
                        );
                    })}
                </div>
            ) : (
                !isCollapsed && <p className="text-xs text-text-secondary italic">No hay grupos creados.</p>
            )}
        </div>

        <nav className="flex-grow p-2 sm:p-4" id="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.view}>
                <motion.a
                  href="#"
                  id={item.id}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.view);
                  }}
                  title={isCollapsed ? item.label : ''}
                  className={`flex items-center gap-3 px-4 py-2.5 my-1 rounded-lg text-base font-semibold transition-all duration-200 relative overflow-hidden ${
                    state.activeView === item.view
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'text-text-primary hover:bg-surface-secondary'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon name={item.icon} className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </motion.a>
              </li>
            ))}
          </ul>
        </nav>
        <div className={`p-4 border-t border-border-color space-y-2 ${isCollapsed ? 'flex flex-col items-center px-2' : ''}`}>
          <button
            onClick={startTour}
            title={isCollapsed ? "Guía Rápida" : ""}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-text-secondary hover:text-primary hover:bg-surface-secondary transition-colors duration-200 border border-transparent hover:border-primary/20 ${isCollapsed ? 'justify-center px-2' : ''}`}
          >
            <Icon name="help-circle" className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-semibold whitespace-nowrap">Guía Rápida</span>}
          </button>
          
          <button
            id="sidebar-settings"
            onClick={() => setIsSettingsOpen(true)}
            title={isCollapsed ? "Configuración" : ""}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-text-primary hover:bg-surface-secondary transition-colors duration-200 ${isCollapsed ? 'justify-center px-2' : ''}`}
          >
            <Icon name="settings" className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-base font-semibold whitespace-nowrap">Configuración</span>}
          </button>
          {appVersion && !isCollapsed && (
              <div className="mt-2 text-center text-xs text-text-secondary opacity-60">
                  v{appVersion}
              </div>
          )}
        </div>
      </aside>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export default Sidebar;