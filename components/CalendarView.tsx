import React, { useState, useMemo, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { CalendarEvent } from '../types';
import { getClassDates } from '../services/dateUtils';
import { GROUP_COLORS } from '../constants';
import Icon from './icons/Icon';
import EventModal from './EventModal';

const CalendarView: React.FC = () => {
    const { state } = useContext(AppContext);
    const { groups, settings, calendarEvents, gcalEvents } = state;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isEventModalOpen, setEventModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const allEventsByDate = useMemo(() => {
        const events: { [date: string]: CalendarEvent[] } = {};

        const addEvent = (event: CalendarEvent) => {
            if (!events[event.date]) {
                events[event.date] = [];
            }
            if (events[event.date].some(e => e.id === event.id)) return;
            events[event.date].push(event);
        };
        
        groups.forEach(group => {
            const classDates = getClassDates(settings.semesterStart, settings.semesterEnd, group.classDays);
            const groupColor = GROUP_COLORS.find(c => c.name === group.color) || GROUP_COLORS[0];
            classDates.forEach(date => {
                addEvent({
                    id: `class-${group.id}-${date}`,
                    date,
                    title: `Clase: ${group.name}`,
                    type: 'class',
                    // UPDATED: Use solid background and white text for better visibility
                    color: `${groupColor.bg} ${groupColor.text}`
                });
            });
        });

        calendarEvents.forEach(event => addEvent(event));
        gcalEvents.forEach(event => addEvent(event));

        Object.values(events).forEach(dayEvents => {
            dayEvents.sort((a,b) => (a.type === 'gcal' ? -1 : 1) - (b.type === 'gcal' ? -1 : 1) || a.title.localeCompare(b.title));
        });

        return events;
    }, [groups, settings.semesterStart, settings.semesterEnd, calendarEvents, gcalEvents]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDateClick = (day: number) => {
        const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(clickedDate);
        setEventModalOpen(true);
    };

    const renderCalendarGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const startDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        const cells = [];
        for (let i = 0; i < startDayOffset; i++) {
            cells.push(<div key={`blank-${i}`} className="border-r border-b border-border-color bg-surface-secondary/70"></div>);
        }

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            const dayEvents = [...(allEventsByDate[dateStr] || [])];
            const dayOfWeek = date.getDay();
            const isToday = dateStr === todayStr;
            
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                const weekendEvent: CalendarEvent = {
                    id: `weekend-rest-${dateStr}`,
                    date: dateStr,
                    title: "Sé feliz y descansa",
                    type: 'custom',
                    color: 'bg-purple-200 text-purple-800'
                };
                if (!dayEvents.some(e => e.id === weekendEvent.id)) {
                    dayEvents.unshift(weekendEvent);
                }
            }

            cells.push(
                <div 
                    key={day} 
                    className="relative border-r border-b border-border-color p-1 sm:p-2 min-h-[100px] sm:min-h-[120px] flex flex-col cursor-pointer transition-colors hover:bg-border-color/40"
                    onClick={() => handleDateClick(day)}
                >
                    <span className={`text-sm font-semibold ${isToday ? 'bg-primary text-primary-text rounded-full w-7 h-7 flex items-center justify-center' : 'text-text-primary'}`}>
                        {day}
                    </span>
                    <div className="mt-1 space-y-1 overflow-y-auto flex-grow">
                        {dayEvents.slice(0, 3).map(event => (
                            <div key={event.id} className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded shadow-sm ${event.color} truncate`}>
                                {event.title}
                            </div>
                        ))}
                        {dayEvents.length > 3 && (
                            <div className="text-[10px] sm:text-xs text-text-secondary font-semibold mt-1">
                                +{dayEvents.length - 3} más
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return cells;
    };
    
    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center justify-between sm:justify-end sm:gap-4 w-full ml-auto">
                    <button onClick={handlePrevMonth} className="p-2 rounded-md hover:bg-surface-secondary transition-colors"><Icon name="arrow-left" /></button>
                    <h2 className="text-xl font-semibold text-center">{currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}</h2>
                    <button onClick={handleNextMonth} className="p-2 rounded-md hover:bg-surface-secondary transition-colors"><Icon name="arrow-right" /></button>
                </div>
            </div>
            
            <div className="bg-surface rounded-xl shadow-sm border border-border-color overflow-hidden">
                <div className="grid grid-cols-7">
                    {weekDays.map(day => (
                        <div key={day} className="p-2 sm:p-3 text-center font-bold text-sm sm:text-base border-b-2 border-border-color bg-surface-secondary/70">
                            <span className="hidden sm:inline">{day}</span>
                            <span className="sm:hidden">{day.charAt(0)}</span>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 border-l border-border-color">
                    {renderCalendarGrid()}
                </div>
            </div>
            
            {selectedDate && (
                <EventModal 
                    isOpen={isEventModalOpen} 
                    onClose={() => setEventModalOpen(false)} 
                    date={selectedDate}
                    events={allEventsByDate[selectedDate.toISOString().split('T')[0]] || []}
                />
            )}
        </div>
    );
};

export default CalendarView;