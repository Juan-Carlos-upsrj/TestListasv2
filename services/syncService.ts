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
        
        // 1. Obtener registros existentes del servidor para evitar duplicados
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
                // Key mejorada con IDs si están disponibles, sino nombres normalizados
                const aid = rec.alumno_id && rec.alumno_id !== '0' ? rec.alumno_id : normalizeForMatch(rec.alumno_nombre);
                const gid = rec.grupo_id && rec.grupo_id !== 'sin_grupo' ? rec.grupo_id : normalizeForMatch(rec.grupo_nombre);
                const key = `${aid}-${gid}-${rec.fecha}`;
                serverRecordsMap.set(key, rec.status);
            }
        });

        // 2. Filtrar registros locales que necesitan subirse
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
                    
                    // Verificamos si ya existe en el servidor para no re-enviar innecesariamente
                    const key = `${student.id}-${group.id}-${date}`;
                    const serverStatus = serverRecordsMap.get(key);
                    
                    if (!serverStatus || serverStatus !== localStatus) {
                        recordsToSync.push({ 
                            profesor_nombre: trimmedProfessorName, 
                            materia_nombre: group.subject, 
                            grupo_id: group.id, // ENVÍO DE ID REAL
                            grupo_nombre: group.name, 
                            alumno_id: student.id, // ENVÍO DE ID REAL
                            alumno_nombre: student.name, 
                            fecha: date, 
                            status: localStatus 
                        });
                    }
                }
            }
        }

        if (recordsToSync.length === 0) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Asistencia al día.', type: 'success' } });
            return;
        }

        // 3. Ejecutar sincronización (Envío como ARRAY DIRECTO según espera api.php Caso 5)
        // NOTA: Tu api.php procesa la asistencia en el bloque `if (is_array($input))` al final.
        const syncResponse = await fetch(fetchUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
            body: JSON.stringify(recordsToSync), // ARRAY DIRECTO
        });

        if (syncResponse.ok) {
            dispatch({ type: 'ADD_TOAST', payload: { message: `Sincronizado correctamente.`, type: 'success' } });
        } else {
            const errorText = await syncResponse.text();
            console.error('[SYNC ERROR]', errorText);
            throw new Error(`Servidor respondió con error ${syncResponse.status}`);
        }
    } catch (error) {
        console.error(error);
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al sincronizar con la nube.', type: 'error' } });
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
                            grupo_id: group.id,
                            grupo_nombre: group.name, 
                            materia_nombre: group.subject, 
                            alumno_id: student.id,
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

export const syncTutorshipData = async (state: AppState, dispatch: Dispatch<AppAction>, silent = false) => {
    if (!checkSettings(state.settings, dispatch)) return;
    
    const { settings, tutorshipData = {}, groups = [], groupTutors = {} } = state;
    const { apiUrl, apiKey, professorName } = settings;
    
    if (!silent) {
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Sincronizando fichas...', type: 'info' } });
    }
    
    try {
        const syncUrl = getBaseApiUrl(apiUrl);
        
        // 1. DESCARGAR (PULL)
        const getResponse = await fetch(syncUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
            body: JSON.stringify({ action: 'get-tutoreo', profesor_nombre: professorName })
        });
        
        if (!getResponse.ok) throw new Error('Error en la respuesta del servidor');
        const rawServerData = await getResponse.json();
        
        const serverRows = rawServerData.tutorshipData || [];
        console.log(`[SYNC] Se encontraron ${serverRows.length} registros en el servidor.`);

        const downloadedData: { [sid: string]: TutorshipEntry } = {};
        const downloadedTutors: { [gid: string]: string } = {};
        
        // Mapeo: ID Local -> Student e Identificadores por Nombre (para rescatar datos sin ID coincidente)
        const localStudentsById = new Map<string, string>();
        const localStudentsByName = new Map<string, string>(); // Nombre normalizado -> ID local

        groups.forEach(g => {
            g.students.forEach(s => {
                localStudentsById.set(s.id, s.name);
                localStudentsByName.set(normalizeForMatch(s.name), s.id);
            });
        });

        // Procesar registros recibidos con lógica de rescate por nombre
        serverRows.forEach((row: any) => {
            let sid = row.alumno_id;
            
            // Si el ID del servidor no existe localmente, intentamos por nombre
            if (!sid || !localStudentsById.has(sid)) {
                const matchedId = localStudentsByName.get(normalizeForMatch(row.alumno_nombre));
                if (matchedId) {
                    sid = matchedId;
                    console.log(`[SYNC] Rescatando nota de "${row.alumno_nombre}" vinculándola al ID local ${sid}`);
                }
            }

            if (sid && (localStudentsById.has(sid) || localStudentsByName.has(normalizeForMatch(row.alumno_nombre)))) {
                downloadedData[sid] = {
                    strengths: row.fortalezas || '',
                    opportunities: row.oportunidades || '',
                    summary: row.resumen || '',
                    author: row.profesor_nombre || 'Docente Externo'
                };
            }
        });

        // Mapear tutores de grupos
        if (rawServerData.groupTutors) {
            Object.entries(rawServerData.groupTutors).forEach(([serverGroupName, tutor]) => {
                const localGroup = groups.find(g => normalizeForMatch(g.name) === normalizeForMatch(serverGroupName));
                if (localGroup) downloadedTutors[localGroup.id] = tutor as string;
            });
        }

        // Actualizar estado masivamente
        if (Object.keys(downloadedData).length > 0) {
            dispatch({ type: 'SET_TUTORSHIP_DATA_BULK', payload: downloadedData });
        }
        if (Object.keys(downloadedTutors).length > 0) {
            dispatch({ type: 'SET_GROUP_TUTORS_BULK', payload: downloadedTutors });
        }

        // 2. SUBIR (PUSH)
        const recordsToUpload: any[] = [];
        groups.forEach(g => {
            const tutorOfThisGroup = groupTutors[g.id];
            const isAuthorized = !tutorOfThisGroup || normalizeForMatch(tutorOfThisGroup) === normalizeForMatch(professorName);
            
            if (isAuthorized) {
                g.students.forEach(s => {
                    const entry = tutorshipData[s.id];
                    if (entry && (entry.strengths || entry.opportunities || entry.summary)) {
                        recordsToUpload.push({
                            profesor_nombre: professorName,
                            grupo_id: g.id,
                            grupo_nombre: g.name,
                            alumno_id: s.id,
                            alumno_nombre: s.name,
                            fortalezas: entry.strengths || '',
                            oportunidades: entry.opportunities || '',
                            resumen: entry.summary || ''
                        });
                    }
                });
            }
        });

        if (recordsToUpload.length > 0) {
            await fetch(syncUrl.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
                body: JSON.stringify({
                    action: 'sync-tutoreo',
                    data: recordsToUpload,
                    groupTutors: groupTutors,
                    profesor_nombre: professorName
                })
            });
        }

        if (!silent) {
            dispatch({ type: 'ADD_TOAST', payload: { message: `Sincronización exitosa.`, type: 'success' } });
        }
        
    } catch (error) {
        console.error('[SYNC ERROR]', error);
        if (!silent) dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al sincronizar con la nube.', type: 'error' } });
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
        
        // Modificamos la estructura para guardar también los alumnos y nombre limpio
        const clasesPorGrupoUnico: { [key: string]: { sub: string; name: string; days: string[]; students: any[] } } = {};
        
        horario.forEach(c => {
            // Usamos ID único combinando nombre y materia para diferenciar listas
            const uniqueKey = `${c.groupName} - ${c.subjectName}`;
            
            if (!clasesPorGrupoUnico[uniqueKey]) {
                clasesPorGrupoUnico[uniqueKey] = { 
                    sub: c.subjectName, 
                    name: c.groupName, // NOMBRE LIMPIO (Solo identificador de grupo)
                    days: [],
                    students: c.students || [] // ASIGNAMOS ALUMNOS DESDE FIREBASE
                };
            }
            if (!clasesPorGrupoUnico[uniqueKey].days.includes(c.day)) {
                clasesPorGrupoUnico[uniqueKey].days.push(c.day);
            }
        });

        for (const [, info] of Object.entries(clasesPorGrupoUnico)) {
            // Buscamos coincidencia exacta de Materia y Grupo para actualizar el correcto
            const exist = groups.find(g => 
                normalizeForMatch(g.name) === normalizeForMatch(info.name) && 
                normalizeForMatch(g.subject) === normalizeForMatch(info.sub)
            );

            if (exist) {
                dispatch({ type: 'SAVE_GROUP', payload: { 
                    ...exist, 
                    classDays: info.days as DayOfWeek[],
                    // Solo inyectar alumnos si el grupo local está vacío o se desea actualizar
                    students: (exist.students.length === 0 && info.students.length > 0) ? info.students : exist.students 
                }});
            } else {
                dispatch({ type: 'SAVE_GROUP', payload: { 
                    id: uuidv4(), 
                    name: info.name, 
                    subject: info.sub, 
                    classDays: info.days as DayOfWeek[], 
                    students: info.students, // ALUMNOS INICIALES DESDE FIREBASE
                    color: GROUP_COLORS[groups.length % GROUP_COLORS.length].name, 
                    evaluationTypes: { 
                        partial1: [{ id: uuidv4(), name: 'General', weight: 100 }], 
                        partial2: [{ id: uuidv4(), name: 'General', weight: 100 }] 
                    } 
                } as Group });
            }
        }
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Horario y Alumnos actualizados.', type: 'success' } });
    } catch (e) {
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al cargar horario.', type: 'error' } });
    }
};