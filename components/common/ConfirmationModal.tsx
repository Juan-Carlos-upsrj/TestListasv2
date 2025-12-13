import React from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from '../icons/Icon';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  iconName?: string;
  variant?: 'primary' | 'danger';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = 'Confirmar',
  iconName = 'check-circle-2',
  variant = 'primary',
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="text-center">
        <Icon 
          name={iconName} 
          className={`w-12 h-12 mx-auto mb-4 ${variant === 'danger' ? 'text-red-500' : 'text-indigo-500'}`} 
        />
        <div className="text-slate-600 dark:text-slate-300">
          {children}
        </div>
      </div>
      <div className="flex justify-center gap-4 mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant={variant} onClick={onConfirm}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
