import { AppState, AppAction, DayOfWeek, AttendanceStatus, TutorshipEntry, Group } from '../types';
import { Dispatch } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { fetchHorarioCompleto } from './horarioService';
import { GROUP_COLORS } from '../constants';
import { calculatePartialAverage } from './gradeCalculation';

const checkSettings = (settings: AppState['settings'], dispatch: Dispatch<AppAction>): boolean => {
    const { apiUrl, apiKey, professorName } = settings;
    if (!apiUrl || !apiKey || !professorName.trim() || professorName.trim() === 'Nombre del Profesor') {
        dispatch({
            type: 'ADD_TOAST',
            payload: { message: 'Por favor, configura la URL, API Key y tu nombre de profesor en Configuración.', type: 'error' }
        });
        return false;
    }
    return true;
};

const getBaseApiUrl = (apiUrl: string): URL => {
    const url = new URL(apiUrl);
    const pathParts = url.pathname.split('/');
    const apiPhpIndex = pathParts.findIndex(p => p.includes('.php'));
    if (apiPhpIndex !== -1) {
        url.pathname = pathParts.slice(0, apiPhpIndex + 1).join('/');
    }
    return url;
};

export const syncAttendanceData = async (state: AppState, dispatch: Dispatch<AppAction>, syncScope: 'today' | 'all') => {
    if (!checkSettings(state.settings, dispatch)) return;

    const { settings, attendance, groups } = state;
    const { apiUrl, apiKey, professorName } = settings;
    const trimmedProfessorName = professorName.trim();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    dispatch({ type: 'ADD_TOAST', payload: { message: 'Comparando datos con el servidor...', type: 'info' } });

    try {
        const fetchUrl = getBaseApiUrl(apiUrl);
        
        const serverResponse = await fetch(fetchUrl.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey
            },
            body: JSON.stringify({
                action: 'get-asistencias',
                profesor_nombre: trimmedProfessorName
            })
        });

        if (!serverResponse.ok) {
            const errorData = await serverResponse.json().catch(() => ({ message: serverResponse.statusText }));
            throw new Error(`Error al obtener datos: ${errorData.message || serverResponse.statusText}`);
        }
        
        const serverData = await serverResponse.json().catch(() => null);
        const serverRecords: any[] = Array.isArray(serverData) ? serverData : [];
        
        const serverRecordsMap = new Map<string, string>(); 
        serverRecords.forEach(rec => {
            if (rec.alumno_nombre && rec.fecha && rec.grupo_nombre) {
                const key = `${rec.alumno_nombre.trim().toLowerCase()}-${rec.grupo_nombre.trim().toLowerCase()}-${rec.fecha}`;
                serverRecordsMap.set(key, rec.status);
            }
        });

        const recordsToSync: any[] = [];
        for (const [groupId, studentAttendances] of Object.entries(attendance)) {
            const group = groups.find(g => g.id === groupId);
            if (!group) continue;

            for (const [studentId, dateAttendances] of Object.entries(studentAttendances)) {
                const student = group.students.find(s => s.id === studentId);
                if (!student) continue;

                for (const [date, localStatus] of Object.entries(dateAttendances)) {
                    if (syncScope === 'today' && date !== todayStr) continue;
                    if (localStatus === AttendanceStatus.Pending) continue;

                    const key = `${student.name.trim().toLowerCase()}-${group.name.trim().toLowerCase()}-${date}`;
                    const serverStatus = serverRecordsMap.get(key);

                    if (!serverStatus || serverStatus !== localStatus) {
                        recordsToSync.push({
                            profesor_nombre: trimmedProfessorName,
                            materia_nombre: group.subject,
                            grupo_nombre: group.name,
                            alumno_nombre: student.name,
                            fecha: date,
                            status: localStatus,
                        });
                    }
                }
            }
        }

        if (recordsToSync.length === 0) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Asistencias al día.', type: 'info' } });
            return;
        }

        const syncResponse = await fetch(fetchUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
            body: JSON.stringify(recordsToSync),
        });
        
        const res = await syncResponse.json();
        if (syncResponse.ok) {
            dispatch({ type: 'ADD_TOAST', payload: { message: `Sincronizado: ${res.registros_procesados} cambios subidos.`, type: 'success' } });
        } else {
             throw new Error(res.message || "Error al subir datos");
        }

    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error de red.';
        dispatch({ type: 'ADD_TOAST', payload: { message: msg, type: 'error' } });
    }
};

export const syncGradesData = async (state: AppState, dispatch: Dispatch<AppAction>) => {
    if (!checkSettings(state.settings, dispatch)) return;

    const { settings, grades, evaluations, groups, attendance } = state;
    const { apiUrl, apiKey, professorName } = settings;

    try {
        const recordsToSync: any[] = [];
        groups.forEach(group => {
            const groupEvals = evaluations[group.id] || [];
            group.students.forEach(student => {
                const studentGrades = grades[group.id]?.[student.id] || {};
                const studentAttendance = attendance[group.id]?.[student.id] || {};

                [1, 2].forEach(parcial => {
                    const avg = calculatePartialAverage(group, parcial as 1 | 2, groupEvals, studentGrades, settings, studentAttendance);
                    if (avg !== null) {
                        recordsToSync.push({
                            profesor_nombre: professorName,
                            grupo_nombre: group.name,
                            materia_nombre: group.subject,
                            alumno_nombre: student.name,
                            alumno_matricula: student.matricula || '',
                            evaluacion_nombre: `Promedio Parcial ${parcial}`,
                            parcial,
                            calificacion: Number(avg.toFixed(2))
                        });
                    }
                });
            });
        });

        if (recordsToSync.length === 0) return;

        const syncUrl = getBaseApiUrl(apiUrl);
        const response = await fetch(syncUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
            body: JSON.stringify({ action: 'sync-calificaciones', data: recordsToSync }),
        });

        if (response.ok) {
            dispatch({ type: 'ADD_TOAST', payload: { message: `Promedios actualizados en la nube.`, type: 'success' } });
        }
    } catch (error) {
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al subir calificaciones.', type: 'error' } });
    }
};

export const syncTutorshipData = async (state: AppState, dispatch: Dispatch<AppAction>) => {
    if (!checkSettings(state.settings, dispatch)) return;

    const { settings, tutorshipData = {}, groupTutors = {}, groups = [] } = state;
    const { apiUrl, apiKey, professorName } = settings;

    try {
        const syncUrl = getBaseApiUrl(apiUrl);

        // 1. DESCARGAR DATOS ACTUALIZADOS (PULL)
        const getResponse = await fetch(syncUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
            body: JSON.stringify({ 
                action: 'get-tutoreo',
                profesor_nombre: professorName
            })
        });

        if (getResponse.ok) {
            const rawServerData = await getResponse.json();
            
            const finalProcessedData: { [sid: string]: TutorshipEntry } = {};
            const localStudentsMap = new Map<string, string>(); // "Nombre-Grupo" -> localID
            groups.forEach(g => g.students.forEach(s => {
                localStudentsMap.set(`${s.name.trim().toLowerCase()}-${g.name.trim().toLowerCase()}`, s.id);
            }));

            let matchedCount = 0;
            const serverRows = Array.isArray(rawServerData) ? rawServerData : (rawServerData.data || []);

            serverRows.forEach((row: any) => {
                // Prioridad 1: Vincular por identidad nominal (Nombre + Grupo)
                const key = `${(row.alumno_nombre || '').trim().toLowerCase()}-${(row.grupo_nombre || '').trim().toLowerCase()}`;
                let targetId = localStudentsMap.get(key);
                
                // Prioridad 2: Si no hay nombre en la BD, probar por ID técnico (misma PC)
                if (!targetId) {
                    const studentExistsById = groups.some(g => g.students.some(s => s.id === row.alumno_id));
                    if (studentExistsById) targetId = row.alumno_id;
                }

                if (targetId) {
                    finalProcessedData[targetId] = {
                        strengths: row.fortalezas || '',
                        opportunities: row.oportunidades || '',
                        summary: row.resumen || ''
                    };
                    matchedCount++;
                }
            });

            if (matchedCount > 0) {
                dispatch({ type: 'SET_TUTORSHIP_DATA_BULK', payload: finalProcessedData });
            }

            if (rawServerData.groupTutors) {
                const mappedTutors: { [gid: string]: string } = {};
                Object.entries(rawServerData.groupTutors).forEach(([serverGroupName, tutor]) => {
                    const localGroup = groups.find(g => g.name.trim().toLowerCase() === serverGroupName.trim().toLowerCase());
                    if (localGroup) mappedTutors[localGroup.id] = tutor as string;
                });
                dispatch({ type: 'SET_GROUP_TUTORS_BULK', payload: mappedTutors });
            }
            
            dispatch({ type: 'ADD_TOAST', payload: { message: `Descarga: ${matchedCount} fichas sincronizadas.`, type: 'info' } });
        }

        // 2. SUBIR MIS CAMBIOS LOCALES (PUSH)
        // Forzamos el envío de Nombres para llenar los campos NULL de tu base de datos
        const recordsToUpload: any[] = [];
        groups.forEach(g => {
            g.students.forEach(s => {
                const entry = tutorshipData[s.id];
                // Si el registro existe localmente, lo mandamos con TODO su contexto de nombres
                if (entry && (entry.strengths || entry.opportunities || entry.summary)) {
                    recordsToUpload.push({
                        profesor_nombre: professorName,
                        grupo_id: g.id, 
                        grupo_nombre: g.name,
                        alumno_id: s.id,
                        alumno_nombre: s.name,
                        fortalezas: entry.strengths,
                        oportunidades: entry.opportunities,
                        resumen: entry.summary
                    });
                }
            });
        });

        if (recordsToUpload.length > 0) {
            const postResponse = await fetch(syncUrl.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
                body: JSON.stringify({
                    action: 'sync-tutoreo',
                    data: recordsToUpload,
                    groupTutors,
                    profesor_nombre: professorName
                })
            });
            
            if (postResponse.ok) {
                 dispatch({ type: 'ADD_TOAST', payload: { message: 'Datos subidos correctamente.', type: 'success' } });
            }
        }

    } catch (error) {
        console.error("Sync error:", error);
    }
};

export const syncScheduleData = async (state: AppState, dispatch: Dispatch<AppAction>) => {
    const { settings, groups } = state;
    if (!settings.professorName || settings.professorName.trim() === 'Nombre del Profesor') {
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Escribe tu nombre en Configuración.', type: 'error' } });
        return;
    }

    try {
        const horario = await fetchHorarioCompleto(settings.professorName.trim());
        if (horario.length === 0) return;

        dispatch({ type: 'SET_TEACHER_SCHEDULE', payload: horario });

        const clasesPorGrupoUnico: { [name: string]: { sub: string; days: string[] } } = {};
        horario.forEach(c => {
            const key = `${c.groupName} - ${c.subjectName}`;
            if (!clasesPorGrupoUnico[key]) clasesPorGrupoUnico[key] = { sub: c.subjectName, days: [] };
            if (!clasesPorGrupoUnico[key].days.includes(c.day)) clasesPorGrupoUnico[key].days.push(c.day);
        });
        
        for (const [name, info] of Object.entries(clasesPorGrupoUnico)) {
            const exist = groups.find(g => g.name.toLowerCase() === name.toLowerCase());
            if (exist) {
                dispatch({ type: 'SAVE_GROUP', payload: { ...exist, classDays: info.days as DayOfWeek[] } });
            } else {
                dispatch({ type: 'SAVE_GROUP', payload: {
                    id: uuidv4(), name, subject: info.sub, classDays: info.days as DayOfWeek[], students: [],
                    color: GROUP_COLORS[groups.length % GROUP_COLORS.length].name,
                    evaluationTypes: { partial1: [{ id: uuidv4(), name: 'General', weight: 100 }], partial2: [{ id: uuidv4(), name: 'General', weight: 100 }] }
                } as Group });
            }
        }
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Horario sincronizado.', type: 'success' } });
    } catch (e) {
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Error con Firebase/Horario.', type: 'error' } });
    }
};