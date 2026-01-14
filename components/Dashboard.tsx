
import React, { useContext, useMemo, useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { AppContext } from '../context/AppContext';
import { Group, AttendanceStatus, TeacherClass, DayOfWeek } from '../types';
import Icon from './icons/Icon';
import BirthdayCelebration from './BirthdayCelebration';
import { PROFESSOR_BIRTHDAYS, GROUP_COLORS, DAYS_OF_WEEK } from '../constants';
import Modal from './common/Modal';
import AttendanceTaker from './AttendanceTaker';
import { motion, AnimatePresence } from 'framer-motion';
import { syncAttendanceData, syncScheduleData } from '../services/syncService';
import Button from './common/Button';
import SemesterTransitionModal from './SemesterTransitionModal';
import { v4 as uuidv4 } from 'uuid';

const ResponsiveGridLayout = WidthProvider(Responsive);

// --- COMPONENTE HORARIO ---

const TeacherScheduleModal: React.FC<{ schedule: TeacherClass[], isOpen: boolean, onClose: () => void }> = ({ schedule, isOpen, onClose }) => {
    const { dispatch } = useContext(AppContext);
    const [isEditing, setIsEditing] = useState(false);
    
    // Formulario para nueva clase
    const [newClass, setNewClass] = useState<Partial<TeacherClass>>({
        day: 'Lunes',
        startTime: 7,
        duration: 1,
        subjectName: '',
        groupName: ''
    });

    const scheduleByDay = useMemo(() => {
        const map: Record<string, TeacherClass[]> = {};
        DAYS_OF_WEEK.forEach(d => map[d] = []);
        schedule.forEach(c => map[c.day]?.push(c));
        Object.keys(map).forEach(d => map[d].sort((a, b) => a.startTime - b.startTime));
        return map;
    }, [schedule]);

    const formatTime = (hour: number) => `${hour}:00`;

    const handleAddClass = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClass.subjectName || !newClass.groupName) return;
        
        const completeClass: TeacherClass = {
            id: uuidv4(),
            day: (newClass.day as DayOfWeek) || 'Lunes',
            startTime: Number(newClass.startTime) || 7,
            duration: Number(newClass.duration) || 1,
            subjectName: newClass.subjectName,
            groupName: newClass.groupName
        };

        dispatch({ type: 'SET_TEACHER_SCHEDULE', payload: [...schedule, completeClass] });
        setNewClass({ ...newClass, subjectName: '', groupName: '' });
    };

    const handleDeleteClass = (id: string) => {
        dispatch({ type: 'SET_TEACHER_SCHEDULE', payload: schedule.filter(c => c.id !== id) });
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Mi Horario Docente" 
            size="xl"
            footer={
                <div className="flex justify-between w-full">
                    <Button variant="secondary" size="sm" onClick={() => setIsEditing(!isEditing)}>
                        <Icon name={isEditing ? "calendar" : "settings"} className="w-4 h-4" />
                        {isEditing ? "Ver Horario" : "Gestionar Clases"}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
                </div>
            }
        >
            <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                
                {isEditing && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6"
                    >
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <Icon name="plus" className="w-4 h-4" /> Agregar Clase Manual
                        </h4>
                        <form onSubmit={handleAddClass} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-4">
                                <label className="text-[10px] font-bold uppercase text-slate-400">Día</label>
                                <select 
                                    className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white"
                                    value={newClass.day}
                                    onChange={e => setNewClass({...newClass, day: e.target.value as DayOfWeek})}
                                >
                                    {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="sm:col-span-4">
                                <label className="text-[10px] font-bold uppercase text-slate-400">Inicio (Hora)</label>
                                <input 
                                    type="number" min="7" max="22"
                                    className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white"
                                    value={newClass.startTime}
                                    onChange={e => setNewClass({...newClass, startTime: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="sm:col-span-4">
                                <label className="text-[10px] font-bold uppercase text-slate-400">Duración (Horas)</label>
                                <input 
                                    type="number" min="1" max="5"
                                    className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white"
                                    value={newClass.duration}
                                    onChange={e => setNewClass({...newClass, duration: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="sm:col-span-5">
                                <label className="text-[10px] font-bold uppercase text-slate-400">Materia</label>
                                <input 
                                    type="text" placeholder="Ej. Matemáticas"
                                    className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white"
                                    value={newClass.subjectName}
                                    onChange={e => setNewClass({...newClass, subjectName: e.target.value})}
                                />
                            </div>
                            <div className="sm:col-span-5">
                                <label className="text-[10px] font-bold uppercase text-slate-400">Grupo</label>
                                <input 
                                    type="text" placeholder="Ej. 6A"
                                    className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white"
                                    value={newClass.groupName}
                                    onChange={e => setNewClass({...newClass, groupName: e.target.value})}
                                />
                            </div>
                            <div className="sm:col-span-2 flex items-end">
                                <Button type="submit" size="sm" className="w-full !py-2.5">Añadir</Button>
                            </div>
                        </form>
                    </motion.div>
                )}

                <AnimatePresence mode="wait">
                    {DAYS_OF_WEEK.map(day => {
                        const classes = scheduleByDay[day];
                        if (classes.length === 0) return null;

                        return (
                            <motion.div 
                                layout
                                key={day} 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-2"
                            >
                                <h4 className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block">{day}</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {classes.map((c, i) => {
                                        const nextClass = classes[i + 1];
                                        const hasRecess = nextClass && (nextClass.startTime > c.startTime + c.duration);
                                        
                                        return (
                                            <React.Fragment key={c.id}>
                                                <div className="flex items-center gap-4 bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:border-primary transition-colors group">
                                                    <div className="bg-slate-100 p-2 rounded-lg text-center min-w-[70px]">
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Inicio</p>
                                                        <p className="text-sm font-bold text-primary">{formatTime(c.startTime)}</p>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm truncate">{c.subjectName}</p>
                                                        <p className="text-xs text-text-secondary truncate">{c.groupName}</p>
                                                    </div>
                                                    <div className="text-right flex items-center gap-3">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Duración</p>
                                                            <p className="text-xs font-bold text-slate-600">{c.duration}h</p>
                                                        </div>
                                                        {isEditing && (
                                                            <button 
                                                                onClick={() => handleDeleteClass(c.id)}
                                                                className="p-2 text-slate-300 hover:text-accent-red hover:bg-rose-50 rounded-lg transition-all"
                                                            >
                                                                <Icon name="trash-2" className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {hasRecess && !isEditing && (
                                                    <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50/50 border border-dashed border-amber-200 rounded-lg text-amber-700">
                                                        <Icon name="cake" className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Receso Académico</span>
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                
                {schedule.length === 0 && (
                    <div className="text-center py-10 opacity-40">
                        <Icon name="calendar" className="w-16 h-16 mx-auto mb-2" />
                        <p>No hay horario cargado. Pulsa el botón "Horario" en el Dashboard para sincronizar o usa el modo gestión para añadir clases manualmente.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

// --- WIDGETS ---

const WelcomeWidget: React.FC<{ dateString: string }> = ({ dateString }) => {
    const { state } = useContext(AppContext);
    return (
        <div className="flex flex-col justify-center h-full px-2" id="dashboard-welcome-widget">
            <h3 className="font-bold text-base sm:text-xl mb-0.5 text-text-primary truncate">¡Hola, {state.settings.professorName}!</h3>
            <p className="text-[11px] sm:text-sm text-text-secondary capitalize">{dateString}</p>
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
        const grouped = sortedEvents.reduce((acc, event) => {
            const lastEvent = acc[acc.length - 1];
            if (lastEvent && lastEvent.title === event.title) {
                const lastEndDate = new Date(lastEvent.endDate + 'T00:00:00');
                lastEndDate.setDate(lastEndDate.getDate() + 1);
                if (new Date(event.date + 'T00:00:00').getTime() === lastEndDate.getTime()) {
                    lastEvent.endDate = event.date; return acc;
                }
            }
            acc.push({ id: event.id, title: event.title, startDate: event.date, endDate: event.date });
            return acc;
        }, [] as { id: string; title: string; startDate: string; endDate: string; }[]);
        return grouped.slice(0, 4);
    }, [state.gcalEvents]);
    
    if (upcomingEvents.length === 0) return <p className="text-text-secondary text-center flex items-center justify-center h-full opacity-60 text-xs">Sin eventos programados.</p>;

    return (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto h-full pr-1 content-start py-1">
            {upcomingEvents.map(event => {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const startDate = new Date(event.startDate + 'T00:00:00'), endDate = new Date(event.endDate + 'T00:00:00');
                const diffInDays = (d1: Date, d2: Date) => Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
                const startDiff = diffInDays(startDate, today), endDiff = diffInDays(endDate, today);
                const isOngoing = startDiff <= 0 && endDiff >= 0;
                let colorClass = 'bg-surface-secondary';
                if (isOngoing && endDiff <= 2) colorClass = 'bg-accent-red-light border-l-4 border-accent-red';
                else if (!isOngoing && startDiff <= 7) colorClass = 'bg-accent-yellow-light border-l-4 border-accent-yellow';
                const dateString = startDate.getTime() === endDate.getTime() ? startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : `${startDate.getDate()} - ${endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
                return (
                    <li key={event.id} className={`text-[10px] p-2 rounded-md transition-colors shadow-sm flex flex-col justify-center ${colorClass}`}>
                        <p className="font-semibold text-text-primary leading-tight truncate">{event.title}</p>
                        <p className="text-[9px] text-text-secondary capitalize mt-0.5">{dateString}</p>
                    </li>
                );
            })}
        </ul>
    );
};

const CombinedOverviewWidget: React.FC<{ todayStr: string }> = ({ todayStr }) => {
    const { state } = useContext(AppContext);
    const dayOfWeek = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
    const totalStudents = state.groups.reduce((sum, group) => sum + group.students.length, 0);
    const { present, total } = useMemo(() => {
        let p = 0, t = 0;
        state.groups.filter(g => g.classDays.some(d => d.toLowerCase() === dayOfWeek.toLowerCase())).forEach(group => {
            group.students.forEach(student => {
                t++;
                const s = state.attendance[group.id]?.[student.id]?.[todayStr];
                if (s === AttendanceStatus.Present || s === AttendanceStatus.Late || s === AttendanceStatus.Justified || s === AttendanceStatus.Exchange) p++;
            });
        });
        return { present: p, total: t };
    }, [state.groups, state.attendance, todayStr, dayOfWeek]);
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    const color = percentage >= 80 ? 'text-emerald-600' : percentage >= 50 ? 'text-amber-500' : 'text-rose-500';
    const circumference = 2 * Math.PI * 42;
    return (
        <div className="flex flex-col h-full divide-y divide-border-color">
            <div className="flex-1 grid grid-cols-2 gap-1 items-center p-2">
                <div className="flex flex-col items-center justify-center"><p className="text-base sm:text-lg font-bold text-primary">{state.groups.length}</p><p className="text-[8px] text-text-secondary font-medium uppercase truncate">Grupos</p></div>
                <div className="flex flex-col items-center justify-center"><p className="text-base sm:text-lg font-bold text-primary">{totalStudents}</p><p className="text-[8px] text-text-secondary font-medium uppercase truncate">Alumnos</p></div>
            </div>
            <div className="flex-[2] flex flex-col items-center justify-center p-2">
                {total === 0 ? <p className="text-text-secondary text-center text-[10px] opacity-70">Sin clases hoy.</p> : (
                    <>
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-surface-secondary" />
                                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percentage / 100)} className={`${color} transition-all duration-1000 ease-out`} style={{ strokeLinecap: 'round' }} />
                            </svg>
                            <span className={`text-base sm:text-lg font-bold ${color}`}>{percentage}%</span>
                        </div>
                        <p className="text-[10px] font-bold text-text-primary mt-1 truncate">{present} / {total} Asist.</p>
                    </>
                )}
            </div>
        </div>
    );
};

const QuickActionsWidget: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    return (
        <div className="flex flex-col gap-2 h-full justify-center px-1">
            <Button onClick={() => syncAttendanceData(state, dispatch, 'today')} variant="secondary" size="sm" className="w-full justify-start text-[10px] sm:text-xs !px-2"><Icon name="upload-cloud" className="w-3 h-3" /> <span className="truncate">Subir Hoy</span></Button>
            <Button onClick={() => syncScheduleData(state, dispatch)} size="sm" className="w-full justify-start bg-accent text-white text-[10px] sm:text-xs !px-2"><Icon name="download-cloud" className="w-3 h-3" /> <span className="truncate">Horario</span></Button>
        </div>
    );
};

const TakeAttendanceWidget: React.FC<{ onTakeAttendance: (group: Group) => void }> = ({ onTakeAttendance }) => {
    const { state } = useContext(AppContext);
    const dayOfWeek = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
    const todaysClasses = state.groups.filter(g => g.classDays.some(d => d.toLowerCase() === dayOfWeek.toLowerCase()));
    if (todaysClasses.length === 0) return <div className="flex flex-col items-center justify-center h-full text-text-secondary opacity-60"><Icon name="calendar" className="w-8 h-8 mb-1" /><p className="text-[10px]">Sin clases hoy.</p></div>;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto h-full content-start pr-1 py-1" id="dashboard-attendance-widget">
            {todaysClasses.map(group => {
                const colorObj = GROUP_COLORS.find(c => c.name === group.color) || GROUP_COLORS[0];
                return (
                     <motion.button key={group.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => onTakeAttendance(group)} className={`rounded-lg flex items-center justify-start gap-2 p-2 text-left shadow-sm w-full ${colorObj.bg} ${colorObj.text}`}>
                        <div className="bg-white/20 p-1 rounded-md shrink-0"><Icon name="list-checks" className="w-3 h-3" /></div>
                        <div className="min-w-0 overflow-hidden"><p className="font-bold text-[11px] leading-tight truncate">{group.name}</p><p className="text-[9px] opacity-90 truncate">{group.subject}</p></div>
                    </motion.button>
                );
            })}
        </div>
    );
};

const WidgetWrapper: React.FC<{ title: string; children: React.ReactNode; autoHeight?: boolean; id?: string }> = ({ title, children, autoHeight = false, id }) => (
    <div id={id} className="bg-surface p-2 sm:p-3 rounded-xl shadow-sm border border-border-color flex flex-col h-full overflow-hidden">
        {title && <h3 className="font-bold text-[9px] sm:text-[10px] text-text-secondary mb-2 uppercase tracking-wider shrink-0 truncate">{title}</h3>}
        <div className={!autoHeight ? "flex-grow overflow-hidden" : ""}>{children}</div>
    </div>
);

const Dashboard: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const [isTakerOpen, setTakerOpen] = useState(false);
    const [attendanceGroup, setAttendanceGroup] = useState<Group | null>(null);
    const [isTransitionOpen, setTransitionOpen] = useState(false);
    const [isScheduleOpen, setScheduleOpen] = useState(false); 
    const [today, setToday] = useState(new Date());
    const [birthdayPerson, setBirthdayPerson] = useState<string | null>(null);

    React.useEffect(() => {
        const timer = setInterval(() => setToday(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    React.useEffect(() => {
        const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const birthday = PROFESSOR_BIRTHDAYS.find(p => p.birthdate === todayStr);
        setBirthdayPerson(birthday ? birthday.name : null);
    }, [today]);

    const dateString = today.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const handleTakeAttendance = (group: Group) => { setAttendanceGroup(group); setTakerOpen(true); };
    
    const layouts = {
        lg: [{ i: 'welcome', x: 0, y: 0, w: 2, h: 1 }, { i: 'quick-actions', x: 2, y: 0, w: 1, h: 1 }, { i: 'take-attendance', x: 0, y: 1, w: 2, h: 2 }, { i: 'combined-overview', x: 2, y: 1, w: 1, h: 3 }, { i: 'upcoming-events', x: 0, y: 3, w: 2, h: 1 }],
        md: [{ i: 'welcome', x: 0, y: 0, w: 2, h: 1 }, { i: 'quick-actions', x: 2, y: 0, w: 1, h: 1 }, { i: 'take-attendance', x: 0, y: 1, w: 2, h: 2 }, { i: 'combined-overview', x: 2, y: 1, w: 1, h: 3 }, { i: 'upcoming-events', x: 0, y: 3, w: 2, h: 1 }],
        sm: [{ i: 'welcome', x: 0, y: 0, w: 2, h: 1 }, { i: 'quick-actions', x: 0, y: 1, w: 2, h: 1 }, { i: 'take-attendance', x: 0, y: 2, w: 2, h: 2 }, { i: 'combined-overview', x: 0, y: 4, w: 2, h: 2 }, { i: 'upcoming-events', x: 0, y: 6, w: 2, h: 1 }],
        xs: [{ i: 'welcome', x: 0, y: 0, w: 1, h: 1 }, { i: 'quick-actions', x: 0, y: 1, w: 1, h: 1 }, { i: 'take-attendance', x: 0, y: 2, w: 1, h: 2 }, { i: 'combined-overview', x: 0, y: 4, w: 1, h: 2 }, { i: 'upcoming-events', x: 0, y: 6, w: 1, h: 1 }],
        xxs: [{ i: 'welcome', x: 0, y: 0, w: 1, h: 1 }, { i: 'quick-actions', x: 0, y: 1, w: 1, h: 1 }, { i: 'take-attendance', x: 0, y: 2, w: 1, h: 2 }, { i: 'combined-overview', x: 0, y: 4, w: 1, h: 2 }, { i: 'upcoming-events', x: 0, y: 6, w: 1, h: 1 }],
    };

    return (
        <div className="max-w-[1400px] mx-auto relative h-full">
            <BirthdayCelebration name={birthdayPerson || ''} show={!!birthdayPerson} />
            <ResponsiveGridLayout layouts={layouts} breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }} cols={{ lg: 3, md: 3, sm: 2, xs: 1, xxs: 1 }} rowHeight={110} isDraggable={false} isResizable={false} margin={[12, 12]}>
                <div key="welcome"><WidgetWrapper title=""><WelcomeWidget dateString={dateString} /></WidgetWrapper></div>
                <div key="take-attendance"><WidgetWrapper id="dashboard-attendance-widget" title="Pase de Lista Hoy"><TakeAttendanceWidget onTakeAttendance={handleTakeAttendance} /></WidgetWrapper></div>
                <div key="combined-overview"><WidgetWrapper id="dashboard-combined-overview" title="Resumen"><CombinedOverviewWidget todayStr={todayStr} /></WidgetWrapper></div>
                <div key="upcoming-events"><WidgetWrapper id="dashboard-upcoming-events" title="Próximos Eventos"><UpcomingEventsWidget /></WidgetWrapper></div>
                <div key="quick-actions"><WidgetWrapper id="dashboard-quick-actions" title="Acciones"><QuickActionsWidget /></WidgetWrapper></div>
            </ResponsiveGridLayout>

            {/* BOTÓN FLOTANTE HORARIO (ESQUINA INFERIOR DERECHA) */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setScheduleOpen(true)}
                className="fixed bottom-10 right-10 z-[40] w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 transition-colors"
                title="Ver mi horario completo"
            >
                <Icon name="calendar" className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent-red rounded-full border-2 border-white animate-pulse" />
            </motion.button>

            {attendanceGroup && (<Modal isOpen={isTakerOpen} onClose={() => setTakerOpen(false)} title={`Pase: ${attendanceGroup.name}`}><AttendanceTaker students={attendanceGroup.students} date={todayStr} groupAttendance={state.attendance[attendanceGroup.id] || {}} onStatusChange={(sid, s) => dispatch({ type: 'UPDATE_ATTENDANCE', payload: { groupId: attendanceGroup.id, studentId: sid, date: todayStr, status: s } })} onClose={() => setTakerOpen(false)}/></Modal>)}
            <SemesterTransitionModal isOpen={isTransitionOpen} onClose={() => setTransitionOpen(false)} />
            <TeacherScheduleModal schedule={state.teacherSchedule || []} isOpen={isScheduleOpen} onClose={() => setScheduleOpen(false)} />
        </div>
    );
};

export default Dashboard;
