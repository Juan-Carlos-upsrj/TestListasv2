
import React, { useContext, useMemo, useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { AppContext } from '../context/AppContext';
import { Group, AttendanceStatus } from '../types';
import Icon from './icons/Icon';
import BirthdayCelebration from './BirthdayCelebration';
import { PROFESSOR_BIRTHDAYS, GROUP_COLORS } from '../constants';
import Modal from './common/Modal';
import AttendanceTaker from './AttendanceTaker';
import { motion, AnimatePresence } from 'framer-motion';
import { syncAttendanceData, syncScheduleData } from '../services/syncService';
import Button from './common/Button';
import SemesterTransitionModal from './SemesterTransitionModal';

const ResponsiveGridLayout = WidthProvider(Responsive);

// --- Widget Components ---

const WelcomeWidget: React.FC<{ dateString: string }> = ({ dateString }) => {
    const { state } = useContext(AppContext);
    return (
        <div className="flex flex-col justify-center h-full" id="dashboard-welcome-widget">
            <h3 className="font-bold text-lg sm:text-xl mb-1 text-text-primary">Bienvenido/a, {state.settings.professorName}!</h3>
            <p className="text-text-secondary capitalize">{dateString}</p>
        </div>
    );
};

const UpcomingEventsWidget: React.FC = () => {
    const { state } = useContext(AppContext);
    const upcomingEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sortedEvents = state.gcalEvents
            .filter(event => new Date(event.date + 'T00:00:00') >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (sortedEvents.length === 0) return [];

        // Group consecutive events with the same title
        const grouped = sortedEvents.reduce((acc, event) => {
            const lastEvent = acc[acc.length - 1];
            const eventDate = new Date(event.date + 'T00:00:00');
            
            if (lastEvent && lastEvent.title === event.title) {
                const lastEndDate = new Date(lastEvent.endDate + 'T00:00:00');
                const expectedNextDate = new Date(lastEndDate);
                expectedNextDate.setDate(lastEndDate.getDate() + 1);
                
                if (eventDate.getTime() === expectedNextDate.getTime()) {
                    lastEvent.endDate = event.date;
                    return acc;
                }
            }
            
            acc.push({
                id: event.id,
                title: event.title,
                startDate: event.date,
                endDate: event.date,
            });
            return acc;
        }, [] as { id: string; title: string; startDate: string; endDate: string; }[]);
        
        return grouped.slice(0, 3); // Show fewer events as the widget is smaller now
    }, [state.gcalEvents]);
    
    if (upcomingEvents.length === 0) {
        return <p className="text-text-secondary text-center flex items-center justify-center h-full opacity-60 text-sm">No hay próximos eventos de Google Calendar.</p>;
    }

    return (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto h-full pr-1 content-start">
            {upcomingEvents.map(event => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const startDate = new Date(event.startDate + 'T00:00:00');
                const endDate = new Date(event.endDate + 'T00:00:00');

                // Proximity and coloring logic
                const diffInDays = (d1: Date, d2: Date) => Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
                
                const startDiff = diffInDays(startDate, today);
                const endDiff = diffInDays(endDate, today);
                const isOngoing = startDiff <= 0 && endDiff >= 0;

                let colorClass = 'bg-surface-secondary'; // Default
                if (isOngoing && endDiff <= 2) {
                    colorClass = 'bg-accent-red-light border-l-4 border-accent-red'; // Ending soon
                } else if (!isOngoing && startDiff <= 7) {
                    colorClass = 'bg-accent-yellow-light border-l-4 border-accent-yellow'; // Approaching
                }

                // Date formatting logic
                let dateString: string;
                if (startDate.getTime() === endDate.getTime()) {
                    dateString = startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                } else {
                    if (startDate.getMonth() === endDate.getMonth()) {
                        dateString = `${startDate.getDate()} - ${endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
                    } else {
                        dateString = `${startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
                    }
                }

                return (
                    <li key={event.id} className={`text-xs p-2 rounded-md transition-colors shadow-sm flex flex-col justify-center ${colorClass}`}>
                        <p className="font-semibold text-text-primary leading-tight truncate">{event.title}</p>
                        <p className="text-[10px] text-text-secondary capitalize mt-0.5">{dateString}</p>
                    </li>
                );
            })}
        </ul>
    );
};


const CombinedOverviewWidget: React.FC<{ todayStr: string }> = ({ todayStr }) => {
    const { state } = useContext(AppContext);
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('es-ES', { weekday: 'long' });
    const totalStudents = state.groups.reduce((sum, group) => sum + group.students.length, 0);

    const { present, total } = useMemo(() => {
        let presentCount = 0;
        let totalCount = 0;
        state.groups
            .filter(g => g.classDays.some(d => d.toLowerCase() === dayOfWeek.toLowerCase()))
            .forEach(group => {
                group.students.forEach(student => {
                    totalCount++;
                    const status = state.attendance[group.id]?.[student.id]?.[todayStr];
                    if (status === AttendanceStatus.Present || status === AttendanceStatus.Late || status === AttendanceStatus.Justified || status === AttendanceStatus.Exchange) {
                        presentCount++;
                    }
                });
            });
        return { present: presentCount, total: totalCount };
    }, [state.groups, state.attendance, todayStr, dayOfWeek]);

    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    const color = percentage >= 80 ? 'text-emerald-600' : percentage >= 50 ? 'text-amber-500' : 'text-rose-500';

    const circumference = 2 * Math.PI * 42; // r=42 for viewBox

    return (
        <div className="flex flex-col h-full divide-y divide-border-color">
            {/* Top Section: Stats */}
            <div className="flex-1 grid grid-cols-2 gap-2 items-center p-2 pb-3">
                <div className="flex flex-col items-center justify-center p-1">
                    <p className="text-lg sm:text-xl font-bold text-primary">{state.groups.length}</p>
                    <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wide">Grupos</p>
                </div>
                <div className="flex flex-col items-center justify-center p-1">
                    <p className="text-lg sm:text-xl font-bold text-primary">{totalStudents}</p>
                    <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wide">Alumnos</p>
                </div>
            </div>
            
            {/* Bottom Section: Attendance Chart */}
            <div className="flex-[2] flex flex-col items-center justify-center p-2 pt-3">
                {total === 0 ? (
                    <p className="text-text-secondary text-center text-xs opacity-70">Sin clases hoy.</p>
                ) : (
                    <>
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-surface-secondary" />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    stroke="currentColor"
                                    strokeWidth="10"
                                    fill="transparent" 
                                    strokeDasharray={circumference} 
                                    strokeDashoffset={circumference * (1 - percentage / 100)}
                                    className={`${color} transition-all duration-1000 ease-out`} 
                                    style={{ strokeLinecap: 'round' }}
                                />
                            </svg>
                            <span className={`text-xl sm:text-2xl font-bold ${color}`}>{percentage}%</span>
                        </div>
                        <p className="text-xs font-bold text-text-primary mt-2">
                            {present} / {total} Presentes
                        </p>
                        <p className="text-[10px] text-text-secondary uppercase tracking-wide mt-1">Asistencia Hoy</p>
                    </>
                )}
            </div>
        </div>
    );
};

const QuickActionsWidget: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);

    const handleSyncAttendance = () => {
        syncAttendanceData(state, dispatch, 'today');
    };

    const handleSyncSchedule = () => {
        syncScheduleData(state, dispatch);
    };

    return (
        <div className="flex flex-col gap-2 h-full justify-center">
            <Button onClick={handleSyncAttendance} variant="secondary" size="sm" className="w-full justify-start">
                <Icon name="upload-cloud" className="w-4 h-4" /> Subir Asistencias
            </Button>
            <Button onClick={handleSyncSchedule} size="sm" className="w-full justify-start bg-accent text-white hover:opacity-90">
                <Icon name="download-cloud" className="w-4 h-4" /> Actualizar Horario
            </Button>
        </div>
    );
};


const TakeAttendanceWidget: React.FC<{ onTakeAttendance: (group: Group) => void }> = ({ onTakeAttendance }) => {
    const { state } = useContext(AppContext);
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('es-ES', { weekday: 'long' });
    const todaysClasses = state.groups.filter(g => g.classDays.some(d => d.toLowerCase() === dayOfWeek.toLowerCase()));

    if (todaysClasses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary opacity-60">
                <Icon name="calendar" className="w-10 h-10 mb-2" />
                <p className="text-sm">No hay clases programadas para hoy.</p>
            </div>
        );
    }
    
    const baseClasses = 'rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface transition-all duration-200 ease-in-out flex items-center justify-start gap-3 text-left disabled:opacity-50 disabled:cursor-not-allowed';
    // Compact grid styling
    const sizeClasses = 'px-3 py-2';

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto h-full content-start pr-1" id="dashboard-attendance-widget">
            {todaysClasses.map(group => {
                const groupColor = GROUP_COLORS.find(c => c.name === group.color) || GROUP_COLORS[0];
                return (
                     <motion.button
                        key={group.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onTakeAttendance(group)}
                        className={`${baseClasses} ${sizeClasses} ${groupColor.bg} ${groupColor.text} hover:opacity-90 shadow-sm w-full`}
                    >
                        <div className="bg-white/20 p-1 rounded-md flex-shrink-0">
                             <Icon name="list-checks" className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 overflow-hidden">
                            <p className="font-bold text-xs leading-tight truncate">{group.name}</p>
                            <p className="text-[10px] opacity-90 font-normal leading-tight truncate">{group.subject}</p>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
};


const WidgetWrapper: React.FC<{ title: string; children: React.ReactNode; autoHeight?: boolean; id?: string }> = ({ title, children, autoHeight = false, id }) => (
    <div id={id} className="bg-surface p-3 sm:p-4 rounded-xl shadow-sm border border-border-color flex flex-col h-full overflow-hidden">
        {title && <h3 className="font-bold text-xs text-text-secondary mb-3 uppercase tracking-wider flex-shrink-0">{title}</h3>}
        <div className={!autoHeight ? "flex-grow overflow-hidden" : ""}>
            {children}
        </div>
    </div>
);


// Main Dashboard Component
const Dashboard: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const [isTakerOpen, setTakerOpen] = useState(false);
    const [attendanceGroup, setAttendanceGroup] = useState<Group | null>(null);
    const [isTransitionOpen, setTransitionOpen] = useState(false);

    const [today, setToday] = useState(new Date());
    const [birthdayPerson, setBirthdayPerson] = useState<string | null>(null);

    const isSemesterOver = useMemo(() => {
        const end = new Date(state.settings.semesterEnd);
        return today > end;
    }, [today, state.settings.semesterEnd]);

    React.useEffect(() => {
        const timer = setInterval(() => setToday(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    React.useEffect(() => {
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const todayStr = `${month}-${day}`;
        const birthday = PROFESSOR_BIRTHDAYS.find(p => p.birthdate === todayStr);
        setBirthdayPerson(birthday ? birthday.name : null);
    }, [today]);

    const dateString = today.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const handleTakeAttendance = (group: Group) => {
        setAttendanceGroup(group);
        setTakerOpen(true);
    };

    const handleTakerStatusChange = (studentId: string, status: AttendanceStatus) => {
        if (attendanceGroup) {
            dispatch({
                type: 'UPDATE_ATTENDANCE',
                payload: { groupId: attendanceGroup.id, studentId, date: todayStr, status }
            });
        }
    };
    
    // Optimized Layout to use vertical space
    // Row Height reduced to 120 for finer control
    const layouts = {
        lg: [
            { i: 'welcome', x: 0, y: 0, w: 2, h: 1 },
            { i: 'quick-actions', x: 2, y: 0, w: 1, h: 1 }, // Top Right for Quick Actions
            
            { i: 'take-attendance', x: 0, y: 1, w: 2, h: 2 }, // Big central widget
            { i: 'combined-overview', x: 2, y: 1, w: 1, h: 3 }, // Tall sidebar widget for stats/attendance
            
            { i: 'upcoming-events', x: 0, y: 3, w: 2, h: 1 }, // Bottom left, half height
        ],
         md: [
            { i: 'welcome', x: 0, y: 0, w: 2, h: 1 },
            { i: 'quick-actions', x: 2, y: 0, w: 1, h: 1 },
            { i: 'take-attendance', x: 0, y: 1, w: 2, h: 2 },
            { i: 'combined-overview', x: 2, y: 1, w: 1, h: 3 },
            { i: 'upcoming-events', x: 0, y: 3, w: 2, h: 1 },
        ],
        sm: [
            { i: 'welcome', x: 0, y: 0, w: 2, h: 1 },
            { i: 'quick-actions', x: 0, y: 1, w: 2, h: 1 },
            { i: 'take-attendance', x: 0, y: 2, w: 2, h: 2 },
            { i: 'combined-overview', x: 0, y: 4, w: 2, h: 2 },
            { i: 'upcoming-events', x: 0, y: 6, w: 2, h: 1 },
        ],
        xs: [
            { i: 'welcome', x: 0, y: 0, w: 1, h: 1 },
            { i: 'quick-actions', x: 0, y: 1, w: 1, h: 1 },
            { i: 'take-attendance', x: 0, y: 2, w: 1, h: 2 },
            { i: 'combined-overview', x: 0, y: 4, w: 1, h: 2 },
            { i: 'upcoming-events', x: 0, y: 6, w: 1, h: 1 },
        ],
    };

    return (
        <div>
            <BirthdayCelebration name={birthdayPerson || ''} show={!!birthdayPerson} />
            
            <AnimatePresence>
                {isSemesterOver && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-indigo-600 text-white p-3 rounded-lg shadow-md mb-4 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <Icon name="info" className="w-6 h-6"/>
                            <div>
                                <p className="font-bold">El semestre ha finalizado.</p>
                                <p className="text-xs opacity-90">¿Deseas preparar tus grupos para el siguiente ciclo?</p>
                            </div>
                        </div>
                        <Button onClick={() => setTransitionOpen(true)} size="sm" variant="secondary" className="!bg-white !text-indigo-600 whitespace-nowrap">
                            Cerrar Ciclo
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <ResponsiveGridLayout
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 3, md: 3, sm: 2, xs: 1, xxs: 1 }}
                rowHeight={120}
                isDraggable={false}
                isResizable={false}
                margin={[16, 16]}
            >
                <div key="welcome">
                    <WidgetWrapper title=""><WelcomeWidget dateString={dateString} /></WidgetWrapper>
                </div>
                <div key="take-attendance">
                     <WidgetWrapper id="dashboard-attendance-widget" title="Pase de Lista Hoy"><TakeAttendanceWidget onTakeAttendance={handleTakeAttendance} /></WidgetWrapper>
                </div>
                <div key="combined-overview">
                     <WidgetWrapper id="dashboard-combined-overview" title="Resumen"><CombinedOverviewWidget todayStr={todayStr} /></WidgetWrapper>
                </div>
                <div key="upcoming-events">
                     <WidgetWrapper id="dashboard-upcoming-events" title="Próximos Eventos (GCAL)"><UpcomingEventsWidget /></WidgetWrapper>
                </div>
                <div key="quick-actions">
                     <WidgetWrapper id="dashboard-quick-actions" title="Acciones Rápidas"><QuickActionsWidget /></WidgetWrapper>
                </div>
            </ResponsiveGridLayout>
            
            {attendanceGroup && (
                 <Modal isOpen={isTakerOpen} onClose={() => setTakerOpen(false)} title={`Pase de Lista: ${attendanceGroup.name}`}>
                    <AttendanceTaker 
                        students={attendanceGroup.students} 
                        date={todayStr} 
                        groupAttendance={state.attendance[attendanceGroup.id] || {}}
                        onStatusChange={handleTakerStatusChange}
                        onClose={() => setTakerOpen(false)}
                    />
                </Modal>
             )}
             
             <SemesterTransitionModal isOpen={isTransitionOpen} onClose={() => setTransitionOpen(false)} />
        </div>
    );
};

export default Dashboard;