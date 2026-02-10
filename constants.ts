import { AttendanceStatus, DayOfWeek, MotivationalQuote, Professor } from './types';

// Manual version control for the web/mobile app
// New format: 3.3.X (Standard SemVer to avoid Electron errors)
export const APP_VERSION = '3.3.15'; 

export const DAYS_OF_WEEK: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
    AttendanceStatus.Present,
    AttendanceStatus.Absent,
    AttendanceStatus.Late,
    AttendanceStatus.Justified,
    AttendanceStatus.Exchange,
];

// Colores SÓLIDOS para asegurar visibilidad y contraste.
export const STATUS_STYLES: { [key in AttendanceStatus]: { symbol: string; color: string; key: string; } } = {
    [AttendanceStatus.Pending]: { 
        symbol: '-', 
        color: 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700', 
        key: ' ' 
    },
    [AttendanceStatus.Present]: { 
        symbol: 'P', 
        color: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm font-bold', 
        key: 'p' 
    },
    [AttendanceStatus.Absent]: { 
        symbol: 'A', 
        color: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm font-bold', 
        key: 'a' 
    },
    [AttendanceStatus.Late]: { 
        symbol: 'R', 
        color: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm font-bold', 
        key: 'r' 
    },
    [AttendanceStatus.Justified]: { 
        symbol: 'J', 
        color: 'bg-sky-500 text-white hover:bg-sky-600 shadow-sm font-bold', 
        key: 'j' 
    },
    [AttendanceStatus.Exchange]: { 
        symbol: 'I', 
        color: 'bg-violet-500 text-white hover:bg-violet-600 shadow-sm font-bold', 
        key: 'i' 
    },
};

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
    {
        text: "Respiro angustia, exhalo tranquilidad",
        author: "Elia",
        icon: "graduation-cap"
    },
    {
        text: "Sipoooooooo",
        author: "Mely",
        image: "/images/benjamin-franklin.jpg" 
    },
    {
        text: "No pues miaw",
        author: "German",
        icon: "book-marked"
    },
    {
        text: "Ay que triste",
        author: "Yeici",
        icon: "pie-chart"
    }
];

export const GROUP_COLORS = [
    { name: 'blue', hex: '#2563eb', bg: 'bg-blue-600', text: 'text-white', ring: 'ring-blue-600', calendar: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200' },
    { name: 'sky', hex: '#0284c7', bg: 'bg-sky-600', text: 'text-white', ring: 'ring-sky-600', calendar: 'bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200' },
    { name: 'cyan', hex: '#0891b2', bg: 'bg-cyan-600', text: 'text-white', ring: 'ring-cyan-600', calendar: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200' },
    { name: 'teal', hex: '#0d9488', bg: 'bg-teal-600', text: 'text-white', ring: 'ring-teal-600', calendar: 'bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200' },
    { name: 'emerald', hex: '#059669', bg: 'bg-emerald-600', text: 'text-white', ring: 'ring-emerald-600', calendar: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200' },
    { name: 'green', hex: '#16a34a', bg: 'bg-green-600', text: 'text-white', ring: 'ring-green-600', calendar: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' },
    { name: 'lime', hex: '#65a30d', bg: 'bg-lime-600', text: 'text-white', ring: 'ring-lime-600', calendar: 'bg-lime-100 dark:bg-lime-900/50 text-lime-800 dark:text-lime-200' },
    { name: 'yellow', hex: '#ca8a04', bg: 'bg-yellow-600', text: 'text-white', ring: 'ring-yellow-600', calendar: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-blue-200' },
    { name: 'amber', hex: '#d97706', bg: 'bg-amber-600', text: 'text-white', ring: 'ring-amber-600', calendar: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200' },
    { name: 'orange', hex: '#ea580c', bg: 'bg-orange-600', text: 'text-white', ring: 'ring-orange-600', calendar: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200' },
    { name: 'red', hex: '#dc2626', bg: 'bg-red-600', text: 'text-white', ring: 'ring-red-600', calendar: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' },
    { name: 'rose', hex: '#e11d48', bg: 'bg-rose-600', text: 'text-white', ring: 'ring-rose-600', calendar: 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200' },
    { name: 'pink', hex: '#db2777', bg: 'bg-pink-600', text: 'text-white', ring: 'ring-pink-600', calendar: 'bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200' },
    { name: 'fuchsia', hex: '#c026d3', bg: 'bg-fuchsia-600', text: 'text-white', ring: 'ring-fuchsia-600', calendar: 'bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-800 dark:text-fuchsia-200' },
    { name: 'purple', hex: '#9333ea', bg: 'bg-purple-600', text: 'text-white', ring: 'ring-purple-600', calendar: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200' },
    { name: 'violet', hex: '#7c3aed', bg: 'bg-violet-600', text: 'text-white', ring: 'ring-violet-600', calendar: 'bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-200' },
    { name: 'indigo', hex: '#4f46e5', bg: 'bg-indigo-600', text: 'text-white', ring: 'ring-indigo-600', calendar: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200' },
    { name: 'slate', hex: '#475569', bg: 'bg-slate-600', text: 'text-white', ring: 'ring-slate-600', calendar: 'bg-slate-100 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200' },
    { name: 'zinc', hex: '#52525b', bg: 'bg-zinc-600', text: 'text-white', ring: 'ring-zinc-600', calendar: 'bg-zinc-100 dark:bg-slate-900/50 text-zinc-800 dark:text-zinc-200' },
    { name: 'stone', hex: '#57534e', bg: 'bg-stone-600', text: 'text-white', ring: 'ring-stone-600', calendar: 'bg-stone-100 dark:bg-stone-900/50 text-stone-800 dark:text-stone-200' },
    { name: 'midnight', hex: '#1e3a8a', bg: 'bg-indigo-950', text: 'text-white', ring: 'ring-indigo-950', calendar: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-100' },
    { name: 'forest', hex: '#14532d', bg: 'bg-green-900', text: 'text-white', ring: 'ring-green-900', calendar: 'bg-green-100 dark:bg-green-900/50 text-green-900 dark:text-green-100' },
    { name: 'wine', hex: '#881337', bg: 'bg-rose-900', text: 'text-white', ring: 'ring-rose-900', calendar: 'bg-rose-100 dark:bg-rose-900/50 text-rose-900 dark:text-rose-100' },
    { name: 'brown', hex: '#7c2d12', bg: 'bg-orange-900', text: 'text-white', ring: 'ring-orange-900', calendar: 'bg-orange-100 dark:bg-orange-900/50 text-orange-900 dark:text-orange-100' },
];

export const CUSTOM_EVENT_COLOR = 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200';

export const PROFESSOR_BIRTHDAYS: Professor[] = [
    { name: 'Prof. Victor', birthdate: '02-04' },
    { name: 'Profa. Aziz', birthdate: '04-04' },
    { name: 'Prof. Isai', birthdate: '05-03' },
    { name: 'Prof. Mely', birthdate: '06-19' },
    { name: 'Profa. Yeici', birthdate: '07-03' },
    { name: 'Prof. Carmi', birthdate: '07-18' },
    { name: 'Prof. Andy', birthdate: '08-29' },
    { name: 'Prof. Germán', birthdate: '09-24' },
    { name: 'Prof. Paco', birthdate: '10-21' },
    { name: 'Prof. Elia', birthdate: '12-09' },
    { name: 'Prof. Test', birthdate: '10-30' },
];