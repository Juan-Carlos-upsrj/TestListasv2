import React, { useContext, useState, useMemo, useEffect, useCallback, useRef, createContext } from 'react';
import { AppContext } from '../context/AppContext';
import { AttendanceStatus, Student } from '../types';
import { getClassDates } from '../services/dateUtils';
import { STATUS_STYLES } from '../constants';
import Icon from './icons/Icon';
import Modal from './common/Modal';
import Button from './common/Button';
import AttendanceTaker from './AttendanceTaker';
import BulkAttendanceModal from './BulkAttendanceModal';
import AttendanceTextImporter from './AttendanceTextImporter';
// @ts-ignore
import * as ReactWindow from 'react-window';
// @ts-ignore
import type { ListChildComponentProps } from 'react-window';
// @ts-ignore
import AutoSizer from 'react-virtualized-auto-sizer';

// Robust import for FixedSizeList
const List = (ReactWindow as any).FixedSizeList || (ReactWindow as any).default?.FixedSizeList || ReactWindow.FixedSizeList;

// --- CONSTANTS & CONFIG ---
const getResponsiveNameColWidth = () => window.innerWidth < 768 ? 150 : 300;
const DATE_COL_WIDTH = 45;
const STAT_COL_WIDTH = 55;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 96; // 32px * 3 rows

interface Coords { r: number; c: number; }

// --- INTERNAL CONTEXT ---
// We use a context to pass data to the InnerElement (Header) and Rows 
// to avoid re-creating the component definitions on every render.
interface AttendanceContextValue {
    students: Student[];
    classDates: string[];
    attendance: any;
    groupId: string;
    focusedCell: Coords | null;
    selection: { start: Coords | null; end: Coords | null; isDragging: boolean };
    todayStr: string;
    headerStructure: any[];
    totalWidth: number;
    nameColWidth: number;
    handleStatusChange: (studentId: string, date: string, status: AttendanceStatus) => void;
    onMouseDown: (r: number, c: number) => void;
    onMouseEnter: (r: number, c: number) => void;
    precalcStats: any[];
}

const AttendanceInternalContext = createContext<AttendanceContextValue | null>(null);

// --- HELPER FUNCTIONS ---
const calculateStats = (studentAttendance: any, dates: string[], todayStr: string) => {
    let present = 0, total = 0;
    for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        if (date <= todayStr) {
             total++;
             const status = studentAttendance[date];
             if (status === AttendanceStatus.Present || status === AttendanceStatus.Late || status === AttendanceStatus.Justified || status === AttendanceStatus.Exchange) {
                present++;
            }
        }
    }
    return { percent: total > 0 ? Math.round((present / total) * 100) : 100 };
};

// --- COMPONENTS ---

// 1. STICKY HEADER (The "Classic HTML Table" Look)
const StickyHeader = () => {
    const context = useContext(AttendanceInternalContext);
    if (!context) return null;
    const { headerStructure, classDates, totalWidth, todayStr, precalcStats, nameColWidth } = context;

    const globalP1Avg = Math.round(precalcStats.reduce((acc, s) => acc + s.p1.percent, 0) / (precalcStats.length || 1));
    const globalP2Avg = Math.round(precalcStats.reduce((acc, s) => acc + s.p2.percent, 0) / (precalcStats.length || 1));
    const globalTotalAvg = Math.round(precalcStats.reduce((acc, s) => acc + s.global.percent, 0) / (precalcStats.length || 1));

    return (
        <div 
            className="absolute top-0 left-0 z-40 bg-slate-50 border-b border-slate-300 shadow-sm"
            style={{ width: totalWidth, height: HEADER_HEIGHT }}
        >
            {/* ROW 1: PARTIALS */}
            <div className="flex h-8 w-full border-b border-slate-300">
                <div className="sticky left-0 z-50 bg-slate-100 border-r border-slate-300 flex items-center px-2 font-bold text-xs text-slate-600 uppercase tracking-wider" style={{ width: nameColWidth }}>
                    Periodo
                </div>
                {headerStructure.map((part: any, i: number) => (
                    <div key={i} className="flex items-center justify-center border-r border-slate-300 bg-slate-200/50 font-bold text-xs text-slate-600 uppercase" style={{ width: part.width }}>
                        {part.label}
                    </div>
                ))}
                {/* Sticky Stats Headers Row 1 */}
                <div className="sticky right-0 z-50 flex">
                    <div className="bg-amber-50 border-l border-slate-300 flex items-center justify-center font-bold text-[10px] text-amber-700 uppercase" style={{ width: STAT_COL_WIDTH }}></div>
                    <div className="bg-sky-50 border-l border-slate-300 flex items-center justify-center font-bold text-[10px] text-sky-700 uppercase" style={{ width: STAT_COL_WIDTH }}></div>
                    <div className="bg-slate-100 border-l border-slate-300 flex items-center justify-center font-bold text-[10px] text-slate-700 uppercase" style={{ width: STAT_COL_WIDTH }}></div>
                </div>
            </div>

            {/* ROW 2: MONTHS */}
            <div className="flex h-8 w-full border-b border-slate-300">
                <div className="sticky left-0 z-50 bg-slate-100 border-r border-slate-300 flex items-center px-2 font-bold text-xs text-slate-600 uppercase" style={{ width: nameColWidth }}>
                    Mes
                </div>
                {headerStructure.flatMap((part: any) => part.months.map((month: any, j: number) => (
                    <div key={`${part.label}-${j}`} className="flex items-center justify-center border-r border-slate-300 bg-slate-50 font-semibold text-[10px] text-slate-500 uppercase" style={{ width: month.width }}>
                        {month.label}
                    </div>
                )))}
                <div className="sticky right-0 z-50 flex">
                     <div className="bg-amber-50 border-l border-slate-300 flex items-center justify-center font-bold text-[10px] text-amber-700 uppercase" style={{ width: STAT_COL_WIDTH }}></div>
                    <div className="bg-sky-50 border-l border-slate-300 flex items-center justify-center font-bold text-[10px] text-sky-700 uppercase" style={{ width: STAT_COL_WIDTH }}></div>
                    <div className="bg-slate-100 border-l border-slate-300 flex items-center justify-center font-bold text-[10px] text-slate-700 uppercase" style={{ width: STAT_COL_WIDTH }}></div>
                </div>
            </div>

            {/* ROW 3: DAYS */}
            <div className="flex h-8 w-full">
                <div className="sticky left-0 z-50 bg-white border-r border-slate-300 flex items-center px-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ width: nameColWidth }}>
                    <span className="font-bold text-sm text-slate-700">Alumno</span>
                </div>
                {classDates.map(date => {
                    const isToday = date === todayStr;
                    const d = new Date(date + 'T00:00:00');
                    return (
                        <div key={date} className={`flex flex-col items-center justify-center border-r border-slate-200 flex-shrink-0 ${isToday ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-600'}`} style={{ width: DATE_COL_WIDTH }}>
                            <span className="text-[10px] leading-none font-bold">{d.getDate()}</span>
                            <span className="text-[8px] leading-none uppercase">{d.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.','')}</span>
                        </div>
                    );
                })}
                <div className="sticky right-0 z-50 flex shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="bg-amber-50 border-l border-slate-300 flex flex-col items-center justify-center text-[9px] font-bold text-amber-800" style={{ width: STAT_COL_WIDTH }}>
                        <span>% P1</span>
                        <span className="text-[8px] opacity-70">({isNaN(globalP1Avg) ? '-' : globalP1Avg}%)</span>
                    </div>
                    <div className="bg-sky-50 border-l border-slate-300 flex flex-col items-center justify-center text-[9px] font-bold text-sky-800" style={{ width: STAT_COL_WIDTH }}>
                        <span>% P2</span>
                        <span className="text-[8px] opacity-70">({isNaN(globalP2Avg) ? '-' : globalP2Avg}%)</span>
                    </div>
                    <div className="bg-slate-100 border-l border-slate-300 flex flex-col items-center justify-center text-[9px] font-bold text-slate-800" style={{ width: STAT_COL_WIDTH }}>
                        <span>Global</span>
                        <span className="text-[8px] opacity-70">({isNaN(globalTotalAvg) ? '-' : globalTotalAvg}%)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 2. INNER ELEMENT (Wrapper for Header + List)
const InnerElement = React.forwardRef(({ children, style, ...rest }: any, ref) => {
    const context = useContext(AttendanceInternalContext);
    if (!context) return null;
    
    // Override height to account for the header offset
    const h = parseFloat(style.height) + HEADER_HEIGHT;
    const w = context.totalWidth;

    return (
        <div ref={ref} {...rest} style={{ ...style, height: h, width: w, position: 'relative' }}>
            <StickyHeader />
            {children}
        </div>
    );
});

// 3. ROW COMPONENT
const Row = React.memo(({ index, style }: ListChildComponentProps) => {
    const context = useContext(AttendanceInternalContext);
    if (!context) return null;
    const { 
        students, classDates, attendance, groupId, 
        focusedCell, selection, todayStr, totalWidth,
        handleStatusChange, onMouseDown, onMouseEnter, precalcStats, nameColWidth
    } = context;

    const student = students[index];
    const studentAttendance = attendance[groupId]?.[student.id] || {};
    const { p1, p2, global } = precalcStats[index];
    
    // Shift row down by header height
    // Add default 0 for safety if style.top is missing
    const top = parseFloat((style.top ?? 0).toString()) + HEADER_HEIGHT;
    
    const getScoreColor = (pct: number) => pct >= 90 ? 'text-emerald-600 bg-emerald-50' : pct >= 80 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';
    
    return (
        <div 
            className="flex items-center border-b border-slate-200 hover:bg-blue-50/30 transition-colors box-border"
            style={{ ...style, top, height: ROW_HEIGHT, width: totalWidth }}
        >
            {/* Sticky Name Column */}
            <div 
                className="sticky left-0 z-10 bg-white border-r border-slate-300 flex items-center px-3 h-full shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                style={{ width: nameColWidth }}
            >
                <div className="truncate w-full">
                    <span className="text-xs font-medium text-slate-700 mr-2 w-5 inline-block text-right text-slate-400">{index + 1}.</span>
                    <span className="font-semibold text-xs text-slate-800">{student.name}</span>
                    {student.nickname && <span className="ml-1 text-[10px] text-slate-500">({student.nickname})</span>}
                </div>
            </div>

            {/* Date Columns */}
            {classDates.map((date, colIndex) => {
                const status = (studentAttendance[date] || AttendanceStatus.Pending) as AttendanceStatus;
                const isFocused = focusedCell?.r === index && focusedCell?.c === colIndex;
                const isToday = date === todayStr;
                
                let isSelected = false;
                if (selection.start && selection.end) {
                     const minR = Math.min(selection.start.r, selection.end.r);
                     const maxR = Math.max(selection.start.r, selection.end.r);
                     const minC = Math.min(selection.start.c, selection.end.c);
                     const maxC = Math.max(selection.start.c, selection.end.c);
                     isSelected = index >= minR && index <= maxR && colIndex >= minC && colIndex <= maxC;
                }

                return (
                    <div 
                        key={date}
                        className={`
                            flex items-center justify-center border-r border-slate-200 h-full cursor-pointer select-none relative
                            ${isToday ? 'bg-blue-50/30' : ''}
                            ${isSelected ? '!bg-blue-100' : ''}
                        `}
                        style={{ width: DATE_COL_WIDTH }}
                        onMouseDown={() => onMouseDown(index, colIndex)}
                        onMouseEnter={() => onMouseEnter(index, colIndex)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            handleStatusChange(student.id, date, AttendanceStatus.Pending);
                        }}
                    >
                        <div className={`
                            w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-transform
                            ${STATUS_STYLES[status].color}
                            ${isFocused ? 'ring-2 ring-primary ring-offset-1 scale-110 z-20' : ''}
                        `}>
                            {STATUS_STYLES[status].symbol}
                        </div>
                    </div>
                );
            })}

            {/* Sticky Stats Columns */}
             <div className="sticky right-0 z-10 flex h-full shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                <div className={`border-l border-slate-300 flex items-center justify-center text-xs font-bold ${getScoreColor(p1.percent)}`} style={{ width: STAT_COL_WIDTH }}>
                    {p1.percent}%
                </div>
                <div className={`border-l border-slate-300 flex items-center justify-center text-xs font-bold ${getScoreColor(p2.percent)}`} style={{ width: STAT_COL_WIDTH }}>
                    {p2.percent}%
                </div>
                <div className={`border-l border-slate-300 flex items-center justify-center text-xs font-bold ${getScoreColor(global.percent)}`} style={{ width: STAT_COL_WIDTH }}>
                    {global.percent}%
                </div>
            </div>
        </div>
    );
}, (prev, next) => {
    // Strict comparison for performance
    return prev.index === next.index && prev.style.width === next.style.width; 
    // Note: Since we use Context, props to Row don't change often. 
    // The context updates trigger re-renders. 
    // React.memo here is actually less effective when consuming Context inside, 
    // BUT react-window relies on it. The real optimization is passing stable objects in Context.
});


// --- MAIN VIEW ---
const AttendanceView: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, attendance, settings, selectedGroupId } = state;
    
    const [isTakerOpen, setTakerOpen] = useState(false);
    const [isBulkFillOpen, setBulkFillOpen] = useState(false);
    const [isTextImporterOpen, setTextImporterOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [nameColWidth, setNameColWidth] = useState(getResponsiveNameColWidth());

    // Fix for tab switching render issue
    useEffect(() => {
        setIsReady(false);
        setTimeout(() => setIsReady(true), 50);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setNameColWidth(getResponsiveNameColWidth());
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const listRef = useRef<any>(null);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Interaction State
    const [focusedCell, setFocusedCell] = useState<Coords | null>(null);
    const [selection, setSelection] = useState<{ start: Coords | null; end: Coords | null; isDragging: boolean }>({ start: null, end: null, isDragging: false });
    
    // Refs for event listeners
    const stateRef = useRef({ focusedCell, selection, group: null as any });

    const setSelectedGroupId = useCallback((id: string | null) => {
        dispatch({ type: 'SET_SELECTED_GROUP', payload: id });
    }, [dispatch]);

    const group = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
    
    // Filter Students Logic
    const filteredStudents = useMemo(() => {
        if (!group) return [];
        if (!searchTerm.trim()) return group.students;
        const term = searchTerm.toLowerCase();
        return group.students.filter(s => 
            s.name.toLowerCase().includes(term) || 
            (s.matricula && s.matricula.toLowerCase().includes(term)) ||
            (s.nickname && s.nickname.toLowerCase().includes(term))
        );
    }, [group, searchTerm]);

    useEffect(() => {
         if (!selectedGroupId && groups.length > 0) setSelectedGroupId(groups[0].id);
    }, [groups, selectedGroupId, setSelectedGroupId]);

    const classDates = useMemo(() => group ? getClassDates(settings.semesterStart, settings.semesterEnd, group.classDays) : [], [group, settings]);

    // Update Ref
    useEffect(() => { stateRef.current = { focusedCell, selection, group }; }, [focusedCell, selection, group]);

    // Handlers
    const handleStatusChange = useCallback((studentId: string, date: string, status: AttendanceStatus) => {
        if (selectedGroupId) dispatch({ type: 'UPDATE_ATTENDANCE', payload: { groupId: selectedGroupId, studentId, date, status } });
    }, [selectedGroupId, dispatch]);

    const handleMouseDown = useCallback((r: number, c: number) => {
        setSelection({ start: { r, c }, end: { r, c }, isDragging: true });
        setFocusedCell({ r, c });
    }, []);

    const handleMouseEnter = useCallback((r: number, c: number) => {
        setSelection(prev => prev.isDragging ? { ...prev, end: { r, c } } : prev);
    }, []);

    // Global Keyboard & Mouse Up
    useEffect(() => {
        const handleMouseUp = () => setSelection(prev => ({ ...prev, isDragging: false }));
        
        const handleKeyDown = (e: KeyboardEvent) => {
            // FIX: Ignore shortcuts if typing in an input field
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const { focusedCell, selection, group } = stateRef.current;
            if (!group) return;
            
            // Navigation
            if (focusedCell && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                // Prevent default only if we are navigating grid, to allow typing in search bar if focused (though focus would be there)
                // Actually, if focusedCell is set, we probably want to capture.
                
                e.preventDefault();
                let { r, c } = focusedCell;
                const maxR = filteredStudents.length - 1;
                const maxC = classDates.length - 1;
                
                if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
                if (e.key === 'ArrowDown') r = Math.min(maxR, r + 1);
                if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
                if (e.key === 'ArrowRight') c = Math.min(maxC, c + 1);
                
                setFocusedCell({ r, c });
                if (listRef.current && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                    listRef.current.scrollToItem(r);
                }
            }

            // Input
            const keyMap: any = { 'p': 'Presente', 'a': 'Ausente', 'r': 'Retardo', 'j': 'Justificado', 'i': 'Intercambio', 'delete': 'Pendiente', 'backspace': 'Pendiente' };
            const status = keyMap[e.key.toLowerCase()];
            
            if (status && focusedCell) { // Only trigger if a cell is focused
                e.preventDefault();
                let targets = [];
                if (selection.start && selection.end) {
                    const minR = Math.min(selection.start.r, selection.end.r);
                    const maxR = Math.max(selection.start.r, selection.end.r);
                    const minC = Math.min(selection.start.c, selection.end.c);
                    const maxC = Math.max(selection.start.c, selection.end.c);
                    for(let r=minR; r<=maxR; r++) for(let c=minC; c<=maxC; c++) targets.push({r,c});
                } else if (focusedCell) {
                    targets.push(focusedCell);
                }
                
                targets.forEach(({r, c}) => {
                     const s = filteredStudents[r]; // Use filtered list
                     const d = classDates[c];
                     if(s && d) handleStatusChange(s.id, d, status as AttendanceStatus);
                });
            }
        };

        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [classDates, handleStatusChange, filteredStudents]); // Added filteredStudents dep


    // Derived Data
    const { p1Dates, p2Dates } = useMemo(() => ({
        p1Dates: classDates.filter(d => d <= settings.firstPartialEnd),
        p2Dates: classDates.filter(d => d > settings.firstPartialEnd)
    }), [classDates, settings.firstPartialEnd]);

    const precalcStats = useMemo(() => {
        if (!selectedGroupId) return [];
        // Calculate stats based on filteredStudents
        return filteredStudents.map(s => {
            const att = attendance[selectedGroupId]?.[s.id] || {};
            return {
                p1: calculateStats(att, p1Dates, todayStr),
                p2: calculateStats(att, p2Dates, todayStr),
                global: calculateStats(att, classDates, todayStr)
            };
        });
    }, [filteredStudents, attendance, selectedGroupId, p1Dates, p2Dates, classDates, todayStr]);

    const headerStructure = useMemo(() => {
        const p1End = new Date(settings.firstPartialEnd);
        const structure = [];
        const p1 = classDates.filter(d => new Date(d) <= p1End);
        const p2 = classDates.filter(d => new Date(d) > p1End);
        
        const getMonths = (dates: string[]) => {
             const months: any[] = [];
             dates.forEach(d => {
                 const m = new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { month: 'long' });
                 const label = m.charAt(0).toUpperCase() + m.slice(1);
                 const last = months[months.length - 1];
                 if (last && last.label === label) last.width += DATE_COL_WIDTH;
                 else months.push({ label, width: DATE_COL_WIDTH });
             });
             return months;
        };

        if (p1.length) structure.push({ label: 'Primer Parcial', width: p1.length * DATE_COL_WIDTH, months: getMonths(p1) });
        if (p2.length) structure.push({ label: 'Segundo Parcial', width: p2.length * DATE_COL_WIDTH, months: getMonths(p2) });
        return structure;
    }, [classDates, settings.firstPartialEnd]);

    const totalWidth = useMemo(() => nameColWidth + (classDates.length * DATE_COL_WIDTH) + (STAT_COL_WIDTH * 3), [classDates.length, nameColWidth]);

    const handleScrollToToday = () => {
        const idx = classDates.findIndex(d => d >= todayStr);
        if(idx >= 0) {
             const outer = document.querySelector('.react-window-outer');
             if(outer) outer.scrollLeft = (idx * DATE_COL_WIDTH);
        }
    };
    
    // Auto-scroll effect
    useEffect(() => {
        if (isReady && group && classDates.length > 0) {
            // Small delay to ensure DOM is rendered
            setTimeout(handleScrollToToday, 100);
        }
    }, [isReady, group?.id, classDates.length]);

    // Context Value
    const contextValue: AttendanceContextValue | null = useMemo(() => (!group ? null : {
        students: filteredStudents, // Use filtered list
        classDates,
        attendance,
        groupId: group.id,
        focusedCell,
        selection,
        todayStr,
        headerStructure,
        totalWidth,
        nameColWidth,
        handleStatusChange,
        onMouseDown: handleMouseDown,
        onMouseEnter: handleMouseEnter,
        precalcStats
    }), [filteredStudents, classDates, attendance, group, focusedCell, selection, todayStr, headerStructure, totalWidth, handleStatusChange, handleMouseDown, handleMouseEnter, precalcStats, nameColWidth]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4 flex-shrink-0">
                 <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center gap-4 sm:ml-auto">
                    <select value={selectedGroupId || ''} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-full sm:w-64 p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-primary">
                        <option value="" disabled>Selecciona un grupo</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name} - {g.subject}</option>)}
                    </select>
                    
                    <div className="relative w-full sm:w-48">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Icon name="search" className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                            placeholder="Buscar alumno..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Button onClick={handleScrollToToday} disabled={!group} variant="secondary"><Icon name="calendar" className="w-4 h-4" /> Ir a Hoy</Button>
                    <div className="hidden md:flex gap-2">
                        <Button onClick={() => setTextImporterOpen(true)} disabled={!group} variant="secondary" size="sm"><Icon name="upload-cloud" className="w-4 h-4" /> Importar</Button>
                        <Button onClick={() => setBulkFillOpen(true)} disabled={!group} variant="secondary" size="sm"><Icon name="grid" className="w-4 h-4" /> Relleno</Button>
                        <Button onClick={() => setTakerOpen(true)} disabled={!group} size="sm"><Icon name="list-checks" className="w-4 h-4" /> Pase Rápido</Button>
                    </div>
                </div>
            </div>

            {group && isReady ? (
                <div className="flex-1 border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
                    <AttendanceInternalContext.Provider value={contextValue}>
                        <AutoSizer>
                            {({ height, width }: any) => (
                                <List
                                    ref={listRef}
                                    height={height}
                                    width={width}
                                    itemCount={filteredStudents.length} // Use filtered count
                                    itemSize={ROW_HEIGHT}
                                    className="react-window-outer"
                                    innerElementType={InnerElement}
                                >
                                    {Row}
                                </List>
                            )}
                        </AutoSizer>
                    </AttendanceInternalContext.Provider>
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <Icon name="check-square" className="w-16 h-16 mx-auto text-slate-300"/>
                    <p className="mt-4 text-slate-500">{group ? 'Cargando...' : 'Selecciona un grupo para comenzar.'}</p>
                </div>
            )}
            
            {group && (<Modal isOpen={isTakerOpen} onClose={() => setTakerOpen(false)} title={`Pase de Lista: ${group.name}`}><AttendanceTaker students={group.students} date={todayStr} groupAttendance={attendance[group.id] || {}} onStatusChange={(id, status) => handleStatusChange(id, todayStr, status)} onClose={() => setTakerOpen(false)} /></Modal>)}
            {group && (<BulkAttendanceModal isOpen={isBulkFillOpen} onClose={() => setBulkFillOpen(false)} group={group} />)}
            {group && (<AttendanceTextImporter isOpen={isTextImporterOpen} onClose={() => setTextImporterOpen(false)} group={group} />)}
        </div>
    );
};

export default AttendanceView;