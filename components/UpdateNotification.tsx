import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './common/Button';
import Icon from './icons/Icon';

interface UpdateNotificationProps {
    onUpdate: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onUpdate }) => {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: '-100%' }}
                animate={{ y: 0 }}
                exit={{ y: '-100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-4 p-4 bg-indigo-600 text-white shadow-lg"
                style={{ marginLeft: '16rem' }} // Offset for the sidebar width
            >
                <Icon name="download-cloud" className="w-6 h-6" />
                <p className="font-semibold">¡Nueva versión disponible!</p>
                <Button 
                    onClick={onUpdate}
                    variant="secondary"
                    size="sm"
                    className="!bg-white !text-indigo-600 hover:!bg-indigo-100"
                >
                    Actualizar Ahora
                </Button>
            </motion.div>
        </AnimatePresence>
    );
};

export default UpdateNotification;
