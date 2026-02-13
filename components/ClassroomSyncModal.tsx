import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Group, Evaluation } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import { getGoogleAccessToken, fetchClassroomCourses, fetchCourseWork, fetchSubmissions, fetchStudentProfiles } from '../services/googleAuthService';
import { v4 as uuidv4 } from 'uuid';
import { normalizeForMatch } from '../services/syncService';

interface ClassroomSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: Group;
}

const ClassroomSyncModal: React.FC<ClassroomSyncModalProps> = ({ isOpen, onClose, group }) => {
    const { dispatch } = useContext(AppContext);
    const [step, setStep] = useState(1); // 1: Auth, 2: Course, 3: Assignments, 4: Syncing
    const [token, setToken] = useState('');
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [assignments, setAssignments] = useState<any[]>([]);
    const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [syncLog, setSyncLog] = useState<string[]>([]);

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            const accessToken = await getGoogleAccessToken();
            setToken(accessToken);
            const classroomCourses = await fetchClassroomCourses(accessToken);
            setCourses(classroomCourses);
            
            // Intento de auto-selección por nombre
            const matchedCourse = classroomCourses.find((c: any) => 
                normalizeForMatch(c.name).includes(normalizeForMatch(group.name)) || 
                normalizeForMatch(group.name).includes(normalizeForMatch(c.name))
            );
            if (matchedCourse) setSelectedCourseId(matchedCourse.id);
            
            setStep(2);
        } catch (err) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al conectar con Google.', type: 'error' } });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCourse = async () => {
        setIsLoading(true);
        try {
            const courseWork = await fetchCourseWork(token, selectedCourseId);
            setAssignments(courseWork);
            setStep(3);
        } catch (err) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al obtener tareas.', type: 'error' } });
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleAssignment = (id: string) => {
        const newSet = new Set(selectedAssignmentIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedAssignmentIds(newSet);
    };

    const executeSync = async () => {
        setStep(4);
        setIsLoading(true);
        const log: string[] = ["Iniciando sincronización..."];
        setSyncLog(log);

        try {
            // 1. Obtener perfiles de estudiantes para mapear por nombre
            log.push("Obteniendo perfiles de alumnos de Classroom...");
            setSyncLog([...log]);
            const classroomStudents = await fetchStudentProfiles(token, selectedCourseId);
            
            for (const assignmentId of Array.from(selectedAssignmentIds)) {
                const assignment = assignments.find(a => a.id === assignmentId);
                log.push(`Sincronizando tarea: ${assignment.title}`);
                setSyncLog([...log]);

                // 2. Crear o encontrar evaluación local
                const existingEvals = (dispatch as any).state?.evaluations[group.id] || [];
                let evaluationId = existingEvals.find((e: any) => e.name === assignment.title)?.id;

                if (!evaluationId) {
                    evaluationId = uuidv4();
                    const newEval: Evaluation = {
                        id: evaluationId,
                        name: assignment.title,
                        maxScore: assignment.maxPoints || 10,
                        partial: 1, // Por defecto al primero
                        typeId: group.evaluationTypes.partial1[0].id
                    };
                    dispatch({ type: 'SAVE_EVALUATION', payload: { groupId: group.id, evaluation: newEval } });
                }

                // 3. Obtener envíos/calificaciones
                const submissions = await fetchSubmissions(token, selectedCourseId, assignmentId);
                
                let count = 0;
                submissions.forEach((sub: any) => {
                    if (sub.assignedGrade !== undefined) {
                        const studentProfile = classroomStudents.find((s: any) => s.userId === sub.userId);
                        if (studentProfile) {
                            const fullName = studentProfile.profile.name.fullName;
                            const matchedStudent = group.students.find(s => 
                                normalizeForMatch(s.name) === normalizeForMatch(fullName)
                            );

                            if (matchedStudent) {
                                dispatch({ 
                                    type: 'UPDATE_GRADE', 
                                    payload: { 
                                        groupId: group.id, 
                                        studentId: matchedStudent.id, 
                                        evaluationId: evaluationId, 
                                        score: sub.assignedGrade 
                                    } 
                                });
                                count++;
                            }
                        }
                    }
                });
                log.push(`✓ ${count} calificaciones actualizadas para "${assignment.title}"`);
                setSyncLog([...log]);
            }
            log.push("Sincronización completada con éxito.");
            setSyncLog([...log]);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Classroom sincronizado.', type: 'success' } });
        } catch (err) {
            log.push("❌ Error fatal durante la sincronización.");
            setSyncLog([...log]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Sincronización con Google Classroom" size="lg">
            <div className="space-y-6">
                {step === 1 && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-100 shadow-sm">
                            <Icon name="google" className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">Conectar mi cuenta</h3>
                        <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
                            Importaremos tus tareas y calificaciones directamente desde tu aula virtual para ahorrarte el trabajo manual.
                        </p>
                        <Button onClick={handleConnect} disabled={isLoading} className="bg-white !text-slate-700 border-2 border-slate-200 hover:bg-slate-50 shadow-sm">
                            <Icon name="google" className="w-5 h-5 mr-2" />
                            {isLoading ? 'Conectando...' : 'Iniciar sesión con Google'}
                        </Button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-800">Paso 2: Selecciona el curso de Classroom</h4>
                        <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                            {courses.map(course => (
                                <button 
                                    key={course.id}
                                    onClick={() => setSelectedCourseId(course.id)}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedCourseId === course.id ? 'border-primary bg-primary/5 shadow-md' : 'border-slate-100 hover:border-slate-200'}`}
                                >
                                    <p className="font-black text-sm uppercase">{course.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{course.section || 'Sin sección'}</p>
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSelectCourse} disabled={!selectedCourseId || isLoading}>
                                {isLoading ? 'Cargando tareas...' : 'Continuar'} <Icon name="arrow-right" className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-800">Paso 3: Selecciona tareas a sincronizar</h4>
                            <button onClick={() => setSelectedAssignmentIds(new Set(assignments.map(a => a.id)))} className="text-xs font-bold text-primary underline">Seleccionar todas</button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                            {assignments.map(a => (
                                <div 
                                    key={a.id} 
                                    onClick={() => handleToggleAssignment(a.id)}
                                    className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${selectedAssignmentIds.has(a.id) ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100'}`}
                                >
                                    <input type="checkbox" checked={selectedAssignmentIds.has(a.id)} readOnly className="h-4 w-4 rounded text-indigo-600" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black truncate">{a.title}</p>
                                        <p className="text-[9px] text-slate-400 font-bold">Máximo: {a.maxPoints || 'No calificado'} pts</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between pt-4">
                            <Button variant="secondary" onClick={() => setStep(2)}>Atrás</Button>
                            <Button onClick={executeSync} disabled={selectedAssignmentIds.size === 0 || isLoading}>
                                Sincronizar Ahora <Icon name="check-circle-2" className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-4">
                        <div className="flex flex-col items-center py-6">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLoading ? 'bg-indigo-100 text-indigo-600 animate-spin' : 'bg-emerald-100 text-emerald-600'}`}>
                                <Icon name={isLoading ? "settings" : "check-circle-2"} className="w-6 h-6" />
                            </div>
                            <h4 className="mt-4 font-black text-slate-800 uppercase tracking-widest">{isLoading ? 'Procesando datos...' : 'Proceso Finalizado'}</h4>
                        </div>
                        <div className="bg-slate-900 rounded-2xl p-4 font-mono text-[10px] text-emerald-400 h-48 overflow-y-auto custom-scrollbar">
                            {syncLog.map((line, i) => <p key={i} className="mb-1">{line}</p>)}
                        </div>
                        {!isLoading && <Button onClick={onClose} className="w-full">Cerrar Asistente</Button>}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ClassroomSyncModal;