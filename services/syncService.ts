import { AppState, AppAction, Group, DayOfWeek, AttendanceStatus } from '../types';
import { Dispatch } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { fetchHorarioCompleto } from './horarioService';
import { GROUP_COLORS } from '../constants';

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

/**
 * Ensures the API URL points directly to the .php file, removing any
 * extra path segments that might have been saved in settings.
 * This prevents malformed URLs that cause 400 Bad Request errors.
 * @param apiUrl The raw API URL from settings.
 * @returns A cleaned URL object.
 */
const getBaseApiUrl = (apiUrl: string): URL => {
    const url = new URL(apiUrl);
    const pathParts = url.pathname.split('/');
    // Find the index of the part that contains '.php'
    const apiPhpIndex = pathParts.findIndex(p => p.includes('.php'));
    if (apiPhpIndex !== -1) {
        // Reconstruct the pathname to end at the .php file
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
        // 1. Obtener los registros existentes del servidor usando POST
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
            // Handle case where server returns empty for no records, but not as an error
            if (serverResponse.status === 404 || (await serverResponse.text()).trim() === "") {
                 // Assume no records exist and proceed
            } else {
                throw new Error(`Error al obtener datos del servidor: ${errorData.message}`);
            }
        }
        
        const serverData = await serverResponse.json().catch(() => null);
        const serverRecords: any[] = Array.isArray(serverData) ? serverData : [];
        
        // 2. Crear un mapa para una búsqueda eficiente
        const serverRecordsMap = new Map<string, string>(); // Key: 'alumno_id-fecha', Value: 'status'
        serverRecords.forEach(rec => {
            if (rec.alumno_id && rec.fecha) {
                serverRecordsMap.set(`${rec.alumno_id}-${rec.fecha}`, rec.status);
            }
        });

        // 3. Comparar y encontrar diferencias
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
                    // Ignorar si el modo es 'today' y la fecha no es hoy
                    if (syncScope === 'today' && date !== todayStr) {
                        continue;
                    }

                    // Ignorar registros pendientes
                    if (localStatus === AttendanceStatus.Pending) {
                        continue;
                    }

                    const key = `${studentId}-${date}`;
                    const serverStatus = serverRecordsMap.get(key);

                    // Sincronizar si el registro es nuevo O si el estado ha cambiado
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

        // 4. Enviar solo las diferencias
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

    const { settings, grades, evaluations, groups } = state;
    const { apiUrl, apiKey, professorName } = settings;
    const trimmedProfessorName = professorName.trim();

    dispatch({ type: 'ADD_TOAST', payload: { message: 'Preparando calificaciones...', type: 'info' } });

    try {
        const recordsToSync: any[] = [];
        const groupsMap = new Map(groups.map(g => [g.id, g]));

        // Iterate through all groups in the grades object
        for (const [groupId, studentGrades] of Object.entries(grades)) {
            const group = groupsMap.get(groupId);
            if (!group) continue;
            
            const groupEvaluations = evaluations[groupId] || [];
            const evalsMap = new Map(groupEvaluations.map(e => [e.id, e]));
            const studentsMap = new Map(group.students.map(s => [s.id, s]));

            // Iterate through students
            for (const [studentId, evalGrades] of Object.entries(studentGrades)) {
                const student = studentsMap.get(studentId);
                if (!student) continue;

                // Iterate through evaluations
                for (const [evalId, score] of Object.entries(evalGrades)) {
                    if (score === null || score === undefined) continue;

                    const evaluation = evalsMap.get(evalId);
                    if (!evaluation) continue;

                    recordsToSync.push({
                        profesor_nombre: trimmedProfessorName,
                        grupo_id: groupId,
                        grupo_nombre: group.name,
                        materia_nombre: group.subject,
                        alumno_id: studentId,
                        alumno_nombre: student.name,
                        alumno_matricula: student.matricula || '',
                        evaluacion_id: evalId,
                        evaluacion_nombre: evaluation.name,
                        parcial: evaluation.partial,
                        calificacion: score,
                        max_score: evaluation.maxScore
                    });
                }
            }
        }

        if (recordsToSync.length === 0) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'No hay calificaciones registradas para subir.', type: 'info' } });
            return;
        }

        dispatch({ type: 'ADD_TOAST', payload: { message: `Subiendo ${recordsToSync.length} calificaciones...`, type: 'info' } });

        const syncUrl = getBaseApiUrl(apiUrl);

        // Send data to server
        // Note: The backend script needs to handle a 'grades' type action or infer it from structure
        // Since we are reusing the endpoint, we might need to wrap it or the backend needs to be smart.
        // Assuming we send a list and the backend handles upserts.
        // If your backend specifically looks for 'action', we might need to wrap this.
        // Current implementation matches the bulk structure of syncAttendanceData which sends a raw array.
        
        const syncResponse = await fetch(syncUrl.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey,
            },
            body: JSON.stringify({
                action: 'sync-calificaciones', // Explicit action for the backend to distinguish
                data: recordsToSync
            }),
        });

        if (syncResponse.ok) {
            const responseData = await syncResponse.json();
            dispatch({
                type: 'ADD_TOAST',
                payload: { message: `Calificaciones sincronizadas correctamente.`, type: 'success' }
            });
        } else {
             const errorText = await syncResponse.text();
             throw new Error(`Error del servidor: ${syncResponse.statusText} - ${errorText}`);
        }

    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error de red al subir calificaciones.';
        dispatch({ type: 'ADD_TOAST', payload: { message: msg, type: 'error' } });
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

        let gruposCreados = 0;
        let gruposActualizados = 0;

        // A teacher can teach multiple subjects to the same group.
        // We need to create a unique group in the app for each combination of [group name + subject name].
        const clasesPorGrupoUnico: { [uniqueName: string]: { subjectName: string; days: string[] } } = {};

        horario.forEach(clase => {
            // The unique key for a class is its group name combined with the subject name.
            const uniqueGroupName = `${clase.groupName} - ${clase.subjectName}`;

            if (!clasesPorGrupoUnico[uniqueGroupName]) {
                clasesPorGrupoUnico[uniqueGroupName] = {
                    subjectName: clase.subjectName,
                    days: [],
                };
            }
            // Add the day to this unique group if it's not already there.
            if (!clasesPorGrupoUnico[uniqueGroupName].days.includes(clase.day)) {
                clasesPorGrupoUnico[uniqueGroupName].days.push(clase.day);
            }
        });
        
        for (const uniqueGroupName of Object.keys(clasesPorGrupoUnico)) {
            const info = clasesPorGrupoUnico[uniqueGroupName];
            const diasDeClase = info.days;
            
            // Check if a group with this exact unique name already exists.
            const grupoExistente = groups.find(g => g.name.toLowerCase() === uniqueGroupName.toLowerCase());

            if (grupoExistente) {
                // If it exists, update its schedule.
                dispatch({
                    type: 'SAVE_GROUP',
                    payload: { ...grupoExistente, classDays: diasDeClase as DayOfWeek[] }
                });
                gruposActualizados++;
            } else {
                // If not, create a new group.
                const nuevoGrupo: Group = {
                    id: uuidv4(),
                    name: uniqueGroupName, // e.g., "6A - Cálculo"
                    subject: info.subjectName,
                    classDays: diasDeClase as DayOfWeek[],
                    students: [],
                    color: GROUP_COLORS[(groups.length + gruposCreados) % GROUP_COLORS.length].name,
                    // FIX: Added default evaluationTypes to satisfy the Group type definition.
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