
import React, { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../icons/Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-[90vw] lg:max-w-6xl',
    '7xl': 'max-w-[95vw] lg:max-w-7xl',
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  const [sidebarOffset, setSidebarOffset] = useState('0px');

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    
    // Calcular el offset del sidebar para centrado visual real
    const calculateOffset = () => {
        if (window.innerWidth < 768) {
            setSidebarOffset('0px');
            return;
        }
        const sidebar = document.getElementById('sidebar-main');
        if (sidebar) {
            setSidebarOffset(`${sidebar.offsetWidth}px`);
        }
    };

    if (isOpen) {
        window.addEventListener('keydown', handleEsc);
        calculateOffset();
        // Re-calcular si cambia el tamaño de la ventana
        window.addEventListener('resize', calculateOffset);
        
        // Observar cambios en el sidebar (colapso/expansión)
        const observer = new MutationObserver(calculateOffset);
        const sidebar = document.getElementById('sidebar-main');
        if (sidebar) observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
        
        return () => {
            window.removeEventListener('keydown', handleEsc);
            window.removeEventListener('resize', calculateOffset);
            observer.disconnect();
        };
    }
  }, [isOpen, onClose]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
          style={{ paddingLeft: sidebarOffset }} // Ajuste dinámico de centrado
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative z-10 w-full ${sizeClasses[size]} bg-surface rounded-2xl shadow-2xl flex flex-col max-h-[90vh] my-auto border border-border-color`}
          >
            <header className="flex items-center justify-between p-5 border-b border-border-color shrink-0">
              <h2 className="text-xl font-bold text-text-primary tracking-tight">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-text-secondary hover:bg-surface-secondary hover:text-primary transition-all focus:outline-none"
              >
                <Icon name="x" className="w-5 h-5"/>
              </button>
            </header>
            <div className="p-6 overflow-y-auto flex-grow custom-scrollbar">
              {children}
            </div>
            {footer && (
              <footer className="flex justify-end p-5 border-t border-border-color bg-surface-secondary/30 rounded-b-2xl shrink-0">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
