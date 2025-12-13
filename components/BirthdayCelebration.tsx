
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './icons/Icon';

// --- Improved Animations based on User Feedback ---

// --- 1. Improved Balloon Component ---
const Balloon: React.FC<{ i: number }> = ({ i }) => {
    const colors = [
        { main: 'rgba(239, 68, 68, 0.9)', highlight: 'rgba(252, 165, 165, 0.9)' }, // red
        { main: 'rgba(59, 130, 246, 0.9)', highlight: 'rgba(147, 197, 253, 0.9)' }, // blue
        { main: 'rgba(245, 158, 11, 0.9)', highlight: 'rgba(253, 224, 71, 0.9)' }, // amber
        { main: 'rgba(16, 185, 129, 0.9)', highlight: 'rgba(110, 231, 183, 0.9)' }, // green
        { main: 'rgba(168, 85, 247, 0.9)', highlight: 'rgba(216, 180, 254, 0.9)' }  // purple
    ];
    const color = colors[i % colors.length];
    const sideSway = (Math.random() - 0.5) * 100;

    return (
        <motion.div
            className="absolute bottom-0 pointer-events-none flex flex-col items-center"
            style={{ left: `${Math.random() * 80 + 10}%` }}
            initial={{ y: '20vh' }}
            animate={{ y: '-120vh', x: [0, sideSway, 0] }}
            transition={{
                duration: Math.random() * 8 + 10,
                repeat: Infinity,
                delay: Math.random() * 8,
                ease: 'linear',
                repeatType: 'loop',
            }}
        >
            {/* Balloon Body with gradient and realistic shape */}
            <div 
                className="w-16 h-20"
                style={{
                    background: `radial-gradient(circle at 30% 30%, ${color.highlight}, ${color.main})`,
                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                }}
            />
            {/* Knot at the bottom */}
            <div 
                className="w-2 h-2 -mt-1"
                style={{
                    backgroundColor: color.main,
                    clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
                }}
            />
        </motion.div>
    );
};

// --- 2. Improved Fireworks Component ---
const fireworkColors = [
    { shades: ['#ef9a9a', '#e57373', '#f44336'] }, // Red tones
    { shades: ['#ce93d8', '#ba68c8', '#9c27b0'] }, // Purple tones
    { shades: ['#90caf9', '#64b5f6', '#2196f3'] }, // Blue tones
    { shades: ['#a5d6a7', '#81c784', '#4caf50'] }, // Green tones
    { shades: ['#fff59d', '#fff176', '#ffeb3b'] }, // Yellow tones
    { shades: ['#ffcc80', '#ffb74d', '#ff9800'] }, // Orange tones
];

// A single sub-burst for the firework
const SubBurst: React.FC<{ color: string; delay: number; size: number }> = ({ color, delay, size }) => {
    const numSparks = 15;
    return (
        <>
            {Array.from({ length: numSparks }).map((_, j) => (
                <motion.div
                    key={j}
                    className="absolute w-2 h-2 rounded-full"
                    style={{ backgroundColor: color, top: '50%', left: '50%' }}
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{
                        scale: [0.5, 1, 0],
                        opacity: [1, 1, 0],
                        x: Math.cos((j / numSparks) * 2 * Math.PI) * (Math.random() * (size * 0.5) + (size * 0.8)),
                        y: Math.sin((j / numSparks) * 2 * Math.PI) * (Math.random() * (size * 0.5) + (size * 0.8)),
                    }}
                    transition={{
                        duration: 1.5,
                        ease: 'easeOut',
                        delay: delay,
                        repeat: Infinity,
                        repeatDelay: 5
                    }}
                />
            ))}
        </>
    );
};

// The main firework component, which orchestrates 3 sub-bursts
const FireworkBurst: React.FC<{ i: number }> = ({ i }) => {
    const colors = fireworkColors[i % fireworkColors.length].shades;
    const baseDelay = Math.random() * 5;
    const burstSizes = [60, 100, 140]; // Small, medium, large bursts for a cascading effect

    return (
        <div 
            className="absolute pointer-events-none w-1 h-1" 
            style={{ top: `${Math.random() * 50 + 10}%`, left: `${Math.random() * 80 + 10}%` }}
        >
            <SubBurst color={colors[0]} delay={baseDelay} size={burstSizes[0]} />
            <SubBurst color={colors[1]} delay={baseDelay + 0.2} size={burstSizes[1]} />
            <SubBurst color={colors[2]} delay={baseDelay + 0.4} size={burstSizes[2]} />
        </div>
    );
};


const ConfettiPiece: React.FC<{ i: number }> = ({ i }) => {
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#4caf50', '#ffeb3b', '#ff9800'];
  return (
    <motion.div
      className="absolute top-0 w-2 h-4 pointer-events-none"
      style={{
        backgroundColor: colors[i % colors.length],
        left: `${Math.random() * 100}%`,
      }}
      initial={{ y: '-10vh', opacity: 1 }}
      animate={{ 
          y: '110vh', 
          rotate: Math.random() * 360,
          opacity: [1, 1, 0]
      }}
      transition={{ 
          duration: Math.random() * 3 + 4,
          repeat: Infinity,
          delay: Math.random() * 5,
          ease: "linear"
      }}
    />
  );
};


// --- Main Birthday Component ---

const BirthdayCelebration: React.FC<{ name: string; show: boolean }> = ({ name, show }) => {
    const [isVisible, setIsVisible] = useState(show);

    useEffect(() => {
        setIsVisible(show);
    }, [show]);

    const numConfetti = 50;
    const numBalloons = 15;
    const numFireworks = 8;
    
    return (
        <AnimatePresence>
            {isVisible && (
                 <motion.div 
                    className="fixed inset-0 z-[99] pointer-events-auto cursor-pointer overflow-hidden flex items-center justify-center p-4"
                    onClick={() => setIsVisible(false)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    
                    {Array.from({ length: numConfetti }).map((_, i) => <ConfettiPiece key={`c-${i}`} i={i} />)}
                    {Array.from({ length: numBalloons }).map((_, i) => <Balloon key={`b-${i}`} i={i} />)}
                    {Array.from({ length: numFireworks }).map((_, i) => <FireworkBurst key={`f-${i}`} i={i} />)}

                    <motion.div
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.7, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 15, stiffness: 200, delay: 0.2 } }}
                        exit={{ opacity: 0, scale: 0.8, y: 50 }}
                        className="relative w-full max-w-md cursor-default"
                    >
                       <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="relative p-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
                                <div className="absolute inset-0 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
                                <div className="relative text-center">
                                    <Icon name="cake" className="w-16 h-16 text-white/80 mx-auto mb-4" />
                                    <h2 className="text-4xl font-bold text-white [text-shadow:_2px_2px_4px_rgb(0_0_0_/_20%)]">
                                        ¡Feliz Cumpleaños!
                                    </h2>
                                </div>
                            </div>
                            <div className="p-8 text-center">
                                <p className="text-5xl font-extrabold bg-gradient-to-r from-fuchsia-600 to-pink-600 dark:from-fuchsia-400 dark:to-pink-400 bg-clip-text text-transparent">
                                    {name}
                                </p>
                                <p className="mt-2 text-slate-500 dark:text-slate-400">
                                    ¡Te deseamos un día increíble!
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BirthdayCelebration;
