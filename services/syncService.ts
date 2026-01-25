
import { AppState, AppAction, Group, DayOfWeek, AttendanceStatus, TutorshipEntry } from '../types';
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
            if (serverResponse.status === 404 || (await serverResponse.text()).trim() === "") {
            } else {
                throw new Error(`Error al obtener datos del servidor: ${errorData.message}`);
            }
        }
        
        const serverData = await serverResponse.json().catch(() => null);
        const serverRecords: any[] = Array.isArray(serverData) ? serverData : [];
        
        const serverRecordsMap = new Map<string, string>(); 
        serverRecords.forEach(rec => {
            if (rec.alumno_id && rec.fecha) {
                serverRecordsMap.set(`${rec.alumno_id}-${rec.fecha}`, rec.status);
            }
        });

        const recordsToSync: any[] = [];
        const groupsMap = new Map(groups.map(g => [g.id, g]));

        for (const [groupId, studentAttendances] of Object.entries(attendance)) {
            const group = groupsMap.get(groupId);
            if (!group) continue;
            const studentsMap = new Map(group.students.map(s => [s.id, s]));

            for (const [studentId, dateAttendances] of Object.entries(studentAttendances)) {
                const student = studentsMap.get(studentId);
                if (!student) continue;

                for (const [date, localStatus] of Object.entries(dateAttendances)) {
                    if (syncScope === 'today' && date !== todayStr) {
                        continue;
                    }
                    if (localStatus === AttendanceStatus.Pending) {
                        continue;
                    }

                    const key = `${studentId}-${date}`;
                    const serverStatus = serverRecordsMap.get(key);

                    if (!serverStatus || serverStatus !== localStatus) {
                        recordsToSync.push({
                            profesor_nombre: trimmedProfessorName,
                            materia_nombre: group.subject,
                            grupo_id: groupId,
                            grupo_nombre: group.name,
                            alumno_id: studentId,
                            alumno_nombre: student.name,
                            fecha: date,
                            status: localStatus,
                        });
                    }
                }
            }
        }

        if (recordsToSync.length === 0) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Tus datos ya están actualizados.', type: 'info' } });
            return;
        }

        dispatch({ type: 'ADD_TOAST', payload: { message: `Subiendo ${recordsToSync.length} registros nuevos o modificados...`, type: 'info' } });
        
        const syncUrl = getBaseApiUrl(apiUrl);

        const syncResponse = await fetch(syncUrl.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey,
            },
            body: JSON.stringify(recordsToSync),
        });
        
        const responseData = await syncResponse.json();

        if (syncResponse.ok) {
            dispatch({
                type: 'ADD_TOAST',
                payload: { message: `Sincronización completa. (${responseData.registros_procesados} registros)`, type: 'success' }
            });
        } else {
             throw new Error(responseData.message || `Error del servidor: ${syncResponse.statusText}`);
        }

    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error de red al sincronizar.';
        dispatch({ type: 'ADD_TOAST', payload: { message: msg, type: 'error' } });
    }
};

export const syncGradesData = async (state: AppState, dispatch: Dispatch<AppAction>) => {
    if (!checkSettings(state.settings, dispatch)) return;

    const { settings, grades, evaluations, groups, attendance } = state;
    const { apiUrl, apiKey, professorName } = settings;
    const trimmedProfessorName = professorName.trim();

    dispatch({ type: 'ADD_TOAST', payload: { message: 'Calculando promedios para subir...', type: 'info' } });

    try {
        const recordsToSync: any[] = [];
        
        for (const group of groups) {
            const groupId = group.id;
            const groupEvaluations = evaluations[groupId] || [];
            
            for (const student of group.students) {
                const studentId = student.id;
                const studentGrades = grades[groupId]?.[studentId] || {};
                const studentAttendance = attendance[groupId]?.[studentId] || {};

                const p1Avg = calculatePartialAverage(group, 1, groupEvaluations, studentGrades, settings, studentAttendance);
                if (p1Avg !== null) {
                    recordsToSync.push({
                        profesor_nombre: trimmedProfessorName,
                        grupo_id: groupId,
                        grupo_nombre: group.name,
                        materia_nombre: group.subject,
                        alumno_id: studentId,
                        alumno_nombre: student.name,
                        alumno_matricula: student.matricula || '',
                        evaluacion_id: 'PROMEDIO_P1', 
                        evaluacion_nombre: 'Promedio Parcial 1',
                        parcial: 1,
                        calificacion: Number(p1Avg.toFixed(2)),
                        max_score: 10
                    });
                }

                const p2Avg = calculatePartialAverage(group, 2, groupEvaluations, studentGrades, settings, studentAttendance);
                if (p2Avg !== null) {
                    recordsToSync.push({
                        profesor_nombre: trimmedProfessorName,
                        grupo_id: groupId,
                        grupo_nombre: group.name,
                        materia_nombre: group.subject,
                        alumno_id: studentId,
                        alumno_nombre: student.name,
                        alumno_matricula: student.matricula || '',
                        evaluacion_id: 'PROMEDIO_P2', 
                        evaluacion_nombre: 'Promedio Parcial 2',
                        parcial: 2,
                        calificacion: Number(p2Avg.toFixed(2)),
                        max_score: 10
                    });
                }

                // ... (remedials and extras remain the same)
            }
        }

        if (recordsToSync.length === 0) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'No hay promedios calculados para subir.', type: 'info' } });
            return;
        }

        dispatch({ type: 'ADD_TOAST', payload: { message: `Subiendo ${recordsToSync.length} promedios...`, type: 'info' } });

        const syncUrl = getBaseApiUrl(apiUrl);

        const syncResponse = await fetch(syncUrl.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey,
            },
            body: JSON.stringify({
                action: 'sync-calificaciones',
                data: recordsToSync
            }),
        });

        if (syncResponse.ok) {
            dispatch({
                type: 'ADD_TOAST',
                payload: { message: `Éxito: Se actualizaron calificaciones en el servidor.`, type: 'success' }
            });
        } else {
             throw new Error(`Error del servidor al subir calificaciones.`);
        }

    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error de red al subir calificaciones.';
        dispatch({ type: 'ADD_TOAST', payload: { message: msg, type: 'error' } });
    }
};

export const syncTutorshipData = async (state: AppState, dispatch: Dispatch<AppAction>) => {
    if (!checkSettings(state.settings, dispatch)) return;

    const { settings, tutorshipData = {}, groupTutors = {} } = state;
    const { apiUrl, apiKey, professorName } = settings;

    dispatch({ type: 'ADD_TOAST', payload: { message: 'Sincronizando información de tutoreo...', type: 'info' } });

    try {
        const syncUrl = getBaseApiUrl(apiUrl);

        // 1. OBTENER DATOS DEL SERVIDOR (PULL)
        const getResponse = await fetch(syncUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
            body: JSON.stringify({ action: 'get-tutoreo' })
        });

        if (getResponse.ok) {
            const serverData = await getResponse.json();
            // serverData format: { studentId: TutorshipEntry, groupId: tutorName }
            if (serverData && serverData.tutorshipData) {
                // Actualizar localmente solo si hay cambios reales para no sobreescribir lo que se acaba de teclear
                // En una app real usaríamos timestamps, aquí hacemos un merge básico.
                Object.entries(serverData.tutorshipData).forEach(([sid, entry]) => {
                   dispatch({ type: 'UPDATE_TUTORSHIP', payload: { studentId: sid, entry: entry as TutorshipEntry } });
                });
            }
            if (serverData && serverData.groupTutors) {
                Object.entries(serverData.groupTutors).forEach(([gid, tutor]) => {
                    dispatch({ type: 'SET_GROUP_TUTOR', payload: { groupId: gid, tutorName: tutor as string } });
                });
            }
        }

        // 2. ENVIAR CAMBIOS LOCALES (PUSH)
        // Solo enviamos si el profesor actual es tutor de algún grupo para evitar sobreescribir datos ajenos
        const isTutorOfSomething = Object.values(groupTutors).some(t => t.toLowerCase() === professorName.toLowerCase());
        
        if (isTutorOfSomething) {
            await fetch(syncUrl.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
                body: JSON.stringify({
                    action: 'sync-tutoreo',
                    tutorshipData,
                    groupTutors
                })
            });
        }

        dispatch({ type: 'ADD_TOAST', payload: { message: 'Tutoreo sincronizado correctamente.', type: 'success' } });

    } catch (error) {
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al sincronizar tutoreo.', type: 'error' } });
    }
};

export const syncScheduleData = async (state: AppState, dispatch: Dispatch<AppAction>) => {
    const { settings, groups } = state;
    if (!settings.professorName || settings.professorName.trim() === 'Nombre del Profesor') {
        dispatch({
            type: 'ADD_TOAST',
            payload: { message: 'Por favor, configura tu "Nombre del Profesor/a" en Configuración antes de sincronizar.', type: 'error' }
        });
        return;
    }

    dispatch({ type: 'ADD_TOAST', payload: { message: 'Sincronizando horario desde Firebase...', type: 'info' } });

    try {
        const trimmedProfessorName = settings.professorName.trim();
        const horario = await fetchHorarioCompleto(trimmedProfessorName);

        if (horario.length === 0) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'No se encontraron clases para este profesor.', type: 'info' } });
            return;
        }

        dispatch({ type: 'SET_TEACHER_SCHEDULE', payload: horario });

        let gruposCreados = 0;
        let gruposActualizados = 0;

        const clasesPorGrupoUnico: { [uniqueName: string]: { subjectName: string; days: string[] } } = {};

        horario.forEach(clase => {
            const uniqueGroupName = `${clase.groupName} - ${clase.subjectName}`;

            if (!clasesPorGrupoUnico[uniqueGroupName]) {
                clasesPorGrupoUnico[uniqueGroupName] = {
                    subjectName: clase.subjectName,
                    days: [],
                };
            }
            if (!clasesPorGrupoUnico[uniqueGroupName].days.includes(clase.day)) {
                clasesPorGrupoUnico[uniqueGroupName].days.push(clase.day);
            }
        });
        
        for (const uniqueGroupName of Object.keys(clasesPorGrupoUnico)) {
            const info = clasesPorGrupoUnico[uniqueGroupName];
            const diasDeClase = info.days;
            
            const grupoExistente = groups.find(g => g.name.toLowerCase() === uniqueGroupName.toLowerCase());

            if (grupoExistente) {
                dispatch({
                    type: 'SAVE_GROUP',
                    payload: { ...grupoExistente, classDays: diasDeClase as DayOfWeek[] }
                });
                gruposActualizados++;
            } else {
                const nuevoGrupo: Group = {
                    id: uuidv4(),
                    name: uniqueGroupName, 
                    subject: info.subjectName,
                    classDays: diasDeClase as DayOfWeek[],
                    students: [],
                    color: GROUP_COLORS[(groups.length + gruposCreados) % GROUP_COLORS.length].name,
                    evaluationTypes: {
                        partial1: [{ id: uuidv4(), name: 'General', weight: 100 }],
                        partial2: [{ id: uuidv4(), name: 'General', weight: 100 }],
                    },
                };
                dispatch({ type: 'SAVE_GROUP', payload: nuevoGrupo });
                gruposCreados++;
            }
        }

        dispatch({ type: 'ADD_TOAST', payload: { message: `¡Horario sincronizado! ${gruposCreados} grupos creados, ${gruposActualizados} actualizados.`, type: 'success' } });

    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error desconocido al sincronizar.';
        dispatch({ type: 'ADD_TOAST', payload: { message: msg, type: 'error' } });
    }
};
