
import { AppState, AppAction, DayOfWeek, AttendanceStatus, TutorshipEntry, Group } from '../types';
import { Dispatch } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { fetchHorarioCompleto } from './horarioService';
import { GROUP_COLORS } from '../constants';
import { calculatePartialAverage } from './gradeCalculation';

// Función para normalizar texto de forma agresiva para comparaciones exitosas
export const normalizeForMatch = (s: string) => 
    (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Quita acentos/tildes
        .replace(/[^a-z0-9]/g, "")      // Quita espacios, guiones, puntos, etc.
        .trim();

const checkSettings = (settings: AppState['settings'], dispatch: Dispatch<AppAction>): boolean => {
    const { apiUrl, apiKey, professorName } = settings;
    if (!apiUrl || !apiKey || !professorName.trim() || professorName.trim() === 'Nombre del Profesor') {
        dispatch({
            type: 'ADD_TOAST',
            payload: { message: 'Configura la URL, API Key y tu nombre de profesor.', type: 'error' }
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
    dispatch({ type: 'ADD_TOAST', payload: { message: 'Sincronizando asistencias...', type: 'info' } });
    try {
        const fetchUrl = getBaseApiUrl(apiUrl);
        const serverResponse = await fetch(fetchUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
            body: JSON.stringify({ action: 'get-asistencias', profesor_nombre: trimmedProfessorName })
        });
        if (!serverResponse.ok) throw new Error("Error al obtener datos");
        const serverData = await serverResponse.json().catch(() => null);
        const serverRecords: any[] = Array.isArray(serverData) ? serverData : (serverData?.data || []);
        const serverRecordsMap = new Map<string, string>(); 
        serverRecords.forEach(rec => {
            if (rec.alumno_nombre && rec.fecha && rec.grupo_nombre) {
                const key = `${normalizeForMatch(rec.alumno_nombre)}-${normalizeForMatch(rec.grupo_nombre)}-${rec.fecha}`;
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
                    const key = `${normalizeForMatch(student.name)}-${normalizeForMatch(group.name)}-${date}`;
                    const serverStatus = serverRecordsMap.get(key);
                    if (!serverStatus || serverStatus !== localStatus) {
                        recordsToSync.push({ profesor_nombre: trimmedProfessorName, materia_nombre: group.subject, grupo_nombre: group.name, alumno_nombre: student.name, fecha: date, status: localStatus });
                    }
                }
            }
        }
        if (recordsToSync.length === 0) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Asistencia al día.', type: 'success' } });
            return;
        }
        const syncResponse = await fetch(fetchUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
            body: JSON.stringify(recordsToSync),
        });
        if (syncResponse.ok) dispatch({ type: 'ADD_TOAST', payload: { message: `Sincronizado correctamente.`, type: 'success' } });
    } catch (error) {
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Error de red.', type: 'error' } });
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
                        recordsToSync.push({ profesor_nombre: professorName, grupo_nombre: group.name, materia_nombre: group.subject, alumno_nombre: student.name, alumno_matricula: student.matricula || '', evaluacion_nombre: `Promedio Parcial ${parcial}`, parcial, calificacion: Number(avg.toFixed(2)) });
                    }
                });
            });
        });
        if (recordsToSync.length === 0) return;
        const syncUrl = getBaseApiUrl(apiUrl);
        await fetch(syncUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
            body: JSON.stringify({ action: 'sync-calificaciones', data: recordsToSync }),
        });
        dispatch({ type: 'ADD_TOAST', payload: { message: `Calificaciones actualizadas.`, type: 'success' } });
    } catch (error) {
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al subir calificaciones.', type: 'error' } });
    }
};

export const syncTutorshipData = async (state: AppState, dispatch: Dispatch<AppAction>) => {
    if (!checkSettings(state.settings, dispatch)) return;
    const { settings, tutorshipData = {}, groups = [], groupTutors = {} } = state;
    const { apiUrl, apiKey, professorName } = settings;
    try {
        const syncUrl = getBaseApiUrl(apiUrl);
        // 1. PULL: Descargamos todas las notas disponibles para los alumnos de este profesor
        const getResponse = await fetch(syncUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
            body: JSON.stringify({ action: 'get-tutoreo', profesor_nombre: professorName })
        });
        if (getResponse.ok) {
            const rawServerData = await getResponse.json();
            const serverRows = Array.isArray(rawServerData) ? rawServerData : (rawServerData.data || []);
            const finalProcessedData: { [sid: string]: TutorshipEntry } = {};
            const localStudentsMap = new Map<string, string>();
            groups.forEach(g => g.students.forEach(s => {
                const key = `${normalizeForMatch(s.name)}-${normalizeForMatch(g.name)}`;
                localStudentsMap.set(key, s.id);
            }));
            serverRows.forEach((row: any) => {
                const key = `${normalizeForMatch(row.alumno_nombre)}-${normalizeForMatch(row.grupo_nombre)}`;
                const targetId = localStudentsMap.get(key) || row.alumno_id;
                if (targetId && groups.some(g => g.students.some(s => s.id === targetId))) {
                    finalProcessedData[targetId] = {
                        strengths: row.fortalezas || '',
                        opportunities: row.oportunidades || '',
                        summary: row.resumen || '',
                        author: row.profesor_nombre || 'Docente Externo' // Capturamos quién escribió la nota
                    };
                }
            });
            if (Object.keys(finalProcessedData).length > 0) dispatch({ type: 'SET_TUTORSHIP_DATA_BULK', payload: finalProcessedData });
            if (rawServerData.groupTutors) {
                const mappedTutors: { [gid: string]: string } = {};
                Object.entries(rawServerData.groupTutors).forEach(([serverGroupName, tutor]) => {
                    const localGroup = groups.find(g => normalizeForMatch(g.name) === normalizeForMatch(serverGroupName));
                    if (localGroup) mappedTutors[localGroup.id] = tutor as string;
                });
                if (Object.keys(mappedTutors).length > 0) dispatch({ type: 'SET_GROUP_TUTORS_BULK', payload: mappedTutors });
            }
        }
        // 2. PUSH: Subimos nuestras notas locales si somos el tutor
        const recordsToUpload: any[] = [];
        groups.forEach(g => {
            const tutorOfThisGroup = groupTutors[g.id];
            // Solo subimos si nosotros somos los tutores asignados o si la nota no tiene autor previo
            if (!tutorOfThisGroup || normalizeForMatch(tutorOfThisGroup) === normalizeForMatch(professorName)) {
                g.students.forEach(s => {
                    const entry = tutorshipData[s.id];
                    if (entry && (entry.strengths || entry.opportunities || entry.summary)) {
                        recordsToUpload.push({ profesor_nombre: professorName, grupo_id: g.id, grupo_nombre: g.name, alumno_id: s.id, alumno_nombre: s.name, fortalezas: entry.strengths, oportunidades: entry.opportunities, resumen: entry.summary });
                    }
                });
            }
        });
        if (recordsToUpload.length > 0) {
            await fetch(syncUrl.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
                body: JSON.stringify({ action: 'sync-tutoreo', data: recordsToUpload, groupTutors, profesor_nombre: professorName })
            });
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Fichas compartidas en la nube.', type: 'success' } });
        }
    } catch (error) {
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Error en sincronización colaborativa.', type: 'error' } });
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
            const exist = groups.find(g => normalizeForMatch(g.name) === normalizeForMatch(name));
            if (exist) {
                dispatch({ type: 'SAVE_GROUP', payload: { ...exist, classDays: info.days as DayOfWeek[] } });
            } else {
                dispatch({ type: 'SAVE_GROUP', payload: { id: uuidv4(), name, subject: info.sub, classDays: info.days as DayOfWeek[], students: [], color: GROUP_COLORS[groups.length % GROUP_COLORS.length].name, evaluationTypes: { partial1: [{ id: uuidv4(), name: 'General', weight: 100 }], partial2: [{ id: uuidv4(), name: 'General', weight: 100 }] } } as Group });
            }
        }
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Horario actualizado.', type: 'success' } });
    } catch (e) {
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al cargar horario.', type: 'error' } });
    }
};
