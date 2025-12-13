import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AttendanceStatus, Student } from '../types';
import { STATUS_STYLES, ATTENDANCE_STATUSES } from '../constants';
import Icon from './icons/Icon';
import Button from './common/Button';

interface AttendanceTakerProps {
    students: Student[];
    date: string;
    groupAttendance: { [studentId: string]: { [date: string]: AttendanceStatus } };
    onStatusChange: (studentId: string, status: AttendanceStatus) => void;
    onClose: () => void;
}

const AttendanceTaker: React.FC<AttendanceTakerProps> = ({ students, date, groupAttendance, onStatusChange, onClose }) => {
    const pendingStudents = useMemo(() =>
        students.filter(s => {
            const status = groupAttendance[s.id]?.[date];
            return !status || status === AttendanceStatus.Pending;
        }),
        [students, groupAttendance, date]
    );

    const [currentIndex, setCurrentIndex] = useState(0);

    // This effect ensures currentIndex is valid if pendingStudents list shrinks.
    useEffect(() => {
        if (currentIndex > 0 && currentIndex >= pendingStudents.length) {
            setCurrentIndex(pendingStudents.length - 1);
        }
    }, [pendingStudents, currentIndex]);

    const goToNext = useCallback(() => {
        if (currentIndex < pendingStudents.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onClose();
        }
    }, [currentIndex, pendingStudents.length, onClose]);

    const handleSetStatus = useCallback((status: AttendanceStatus) => {
        const studentToUpdate = pendingStudents[currentIndex];
        if (studentToUpdate) {
            onStatusChange(studentToUpdate.id, status);
        } else if (pendingStudents.length === 0) {
            onClose();
        }
    }, [currentIndex, pendingStudents, onStatusChange, onClose]);
    
    // REF UPDATE: Keep current state in refs to avoid re-binding the event listener
    const stateRef = useRef({ pendingStudents, currentIndex, onStatusChange, onClose });
    
    useEffect(() => {
        stateRef.current = { pendingStudents, currentIndex, onStatusChange, onClose };
    }, [pendingStudents, currentIndex, onStatusChange, onClose]);

    useEffect(() => {
        const stableHandler = (e: KeyboardEvent) => {
             const { pendingStudents, currentIndex, onStatusChange, onClose } = stateRef.current;
             
             if (pendingStudents.length === 0) {
                 if(e.key === 'Escape') onClose();
                 return;
             }

             const keyMap: { [key: string]: AttendanceStatus } = {
                'p': AttendanceStatus.Present,
                'a': AttendanceStatus.Absent,
                'r': AttendanceStatus.Late,
                'j': AttendanceStatus.Justified,
                'i': AttendanceStatus.Exchange,
            };
            
            if (keyMap[e.key.toLowerCase()]) {
                const studentToUpdate = pendingStudents[currentIndex];
                if (studentToUpdate) {
                    onStatusChange(studentToUpdate.id, keyMap[e.key.toLowerCase()]);
                }
            } else if (e.key === 's' || e.key === 'ArrowRight') {
                if (currentIndex < pendingStudents.length - 1) {
                    setCurrentIndex(c => c + 1);
                } else {
                    onClose();
                }
            } else if (e.key === 'ArrowLeft') {
                 if (currentIndex > 0) {
                    setCurrentIndex(c => c - 1);
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', stableHandler);
        return () => window.removeEventListener('keydown', stableHandler);
    }, []); // Zero dependencies: The listener is never removed/re-added during the lifecycle.

    // Map specific colors for buttons to ensure high contrast and distinct visual indicators
    const getButtonColorClass = (status: AttendanceStatus) => {
        switch (status) {
            case AttendanceStatus.Present:
                return '!bg-emerald-600 hover:!bg-emerald-700 !text-white shadow-md shadow-emerald-900/20';
            case AttendanceStatus.Absent:
                return '!bg-rose-600 hover:!bg-rose-700 !text-white shadow-md shadow-rose-900/20';
            case AttendanceStatus.Late:
                return '!bg-amber-500 hover:!bg-amber-600 !text-white shadow-md shadow-amber-900/20';
            case AttendanceStatus.Justified:
                return '!bg-sky-600 hover:!bg-sky-700 !text-white shadow-md shadow-sky-900/20';
            case AttendanceStatus.Exchange:
                return '!bg-violet-600 hover:!bg-violet-700 !text-white shadow-md shadow-violet-900/20';
            default:
                return '';
        }
    };

    if (pendingStudents.length === 0) {
        return (
            <div className="text-center p-4">
                <Icon name="check-circle-2" className="w-16 h-16 text-accent-green-dark mx-auto mb-4" />
                <h3 className="text-2xl font-bold my-4">¡Todo listo!</h3>
                <p className="text-text-secondary mb-6">Todos los alumnos ya tienen un estado de asistencia para hoy.</p>
                <Button onClick={onClose}>Cerrar</Button>
            </div>
        );
    }
    
    const currentStudent = pendingStudents[currentIndex];
    if (!currentStudent) {
        return null;
    }

    const currentStatus = groupAttendance[currentStudent.id]?.[date] || AttendanceStatus.Pending;

    return (
        <div className="text-center p-4">
            <p className="text-sm text-text-secondary">Pase de lista para: {new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { dateStyle: 'long' })}</p>
            <p className="text-slate-400 text-sm">Alumno {currentIndex + 1} de {pendingStudents.length}</p>
            <h3 className="text-3xl font-bold my-2">{currentStudent.name}</h3>
            {currentStudent.nickname && <p className="text-xl text-text-secondary mb-4">"{currentStudent.nickname}"</p>}
            
            <p className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-6 ${STATUS_STYLES[currentStatus].color}`}>
                Estado actual: {currentStatus}
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {ATTENDANCE_STATUSES.map(status => (
                    <Button 
                        key={status} 
                        onClick={() => handleSetStatus(status)} 
                        className={`${getButtonColorClass(status)} !py-4 !text-lg transition-transform active:scale-95`}
                    >
                        <span className="flex flex-col items-center gap-1">
                            <span className="text-2xl font-bold leading-none">({STATUS_STYLES[status].key.toUpperCase()})</span>
                            <span className="text-xs opacity-90 font-normal uppercase tracking-wider">{status}</span>
                        </span>
                    </Button>
                ))}
            </div>
             <Button variant="secondary" onClick={goToNext} className="w-full">
                (S) Saltar / Siguiente <Icon name="arrow-right" className="w-4 h-4" />
            </Button>
            <p className="text-xs text-slate-400 mt-4">Usa las teclas indicadas entre paréntesis para mayor velocidad.</p>
        </div>
    );
};

export default AttendanceTaker;