import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './icons/Icon';

const FridayCelebration: React.FC<{ show: boolean }> = ({ show }) => {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: -100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -100, transition: { duration: 0.5 } }}
                    className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-xl shadow-2xl flex items-center gap-4"
                >
                    <Icon name="cake" className="w-8 h-8 animate-bounce" />
                    <div className="text-center">
                        <p className="font-bold text-lg">¡Es viernes!</p>
                        <p>¡Ya casi es momento de descansar, suerte en el día!</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default FridayCelebration;
