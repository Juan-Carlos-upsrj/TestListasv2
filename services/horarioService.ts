// services/horarioService.ts
// @ts-ignore
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
// @ts-ignore
import { getFirestore, collection, getDocs, query, where, DocumentData } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Esta es la configuración de tu app de Horarios
const firebaseConfig = {
  apiKey: "AIzaSyA5jnDVPPYhSuN7D6qzcETKWW3kzkqV1zs",
  authDomain: "planificador-horarios.firebaseapp.com",
  projectId: "planificador-horarios",
  storageBucket: "planificador-horarios.appspot.com",
  messagingSenderId: "625559113082",
  appId: "1:625559113082:web:836fb0b09be2a60cf2dac3"
};

// Inicializamos la conexión de forma segura.
// Le ponemos un nombre único ("horariosApp") para evitar conflictos.
const app = getApps().find((app: any) => app.name === 'horariosApp') || initializeApp(firebaseConfig, 'horariosApp');
const db = getFirestore(app);


// Definimos las rutas de la base de datos
const basePath = "artifacts/default-scheduler-app-v2/public/data";
const teachersCol = collection(db, `${basePath}/teachers`);
const scheduleCol = collection(db, `${basePath}/schedule`);
const subjectsCol = collection(db, `${basePath}/subjects`);
const groupsCol = collection(db, `${basePath}/groups`);

/**
 * Esta es la función principal que usaremos.
 * Busca el horario completo de un profesor en Firebase.
 */
export const fetchHorarioCompleto = async (profesorNombre: string): Promise<any[]> => {
    
    // 1. Encontrar el ID del profesor
    const qTeacher = query(teachersCol, where("name", "==", profesorNombre));
    let teacherSnapshot = await getDocs(qTeacher);

    if (teacherSnapshot.empty) {
        // Si no se encuentra por apodo, buscamos por nombre completo
        const qTeacherFullName = query(teachersCol, where("fullName", "==", profesorNombre));
        teacherSnapshot = await getDocs(qTeacherFullName);

        if (teacherSnapshot.empty) {
            throw new Error(`No se encontró al profesor "${profesorNombre}" en Firebase.`);
        }
    }
    
    const teacherId = teacherSnapshot.docs[0].id;

    // 2. Obtener el horario de ese profesor
    const qSchedule = query(scheduleCol, where("teacherId", "==", teacherId));
    const scheduleSnapshot = await getDocs(qSchedule);

    if (scheduleSnapshot.empty) {
        return []; // No hay clases, retornamos un arreglo vacío
    }

    // 3. Obtener todos los subjects y groups (para tener los nombres)
    const subjectsSnap = await getDocs(subjectsCol);
    const groupsSnap = await getDocs(groupsCol);
    
    const subjectsMap = new Map(subjectsSnap.docs.map((doc: any) => [doc.id, doc.data()]));
    const groupsMap = new Map(groupsSnap.docs.map((doc: any) => [doc.id, doc.data()]));

    // 4. "Traducir" el horario a datos limpios
    const horarioCompleto = scheduleSnapshot.docs.map((doc: any) => {
        const clase = doc.data();
        const subject = subjectsMap.get(clase.subjectId);
        const group = groupsMap.get(clase.groupId);

        return {
            id: doc.id,
            day: clase.day, // "Lunes", "Martes", etc.
            startTime: clase.startTime, // 7, 8, 9...
            duration: clase.duration, // 1, 2...
            // FIX: Cast subject to `any` to resolve 'unknown' type error.
            subjectName: subject ? (subject as any).name : "Materia Desconocida",
            // FIX: Cast group to `any` to resolve 'unknown' type error.
            groupName: group ? (group as any).name : "Grupo Desconocido"
        };
    });

    return horarioCompleto;
};