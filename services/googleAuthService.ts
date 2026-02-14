// DIAGNÓSTICO PARA ERROR 400:
// 1. En la Consola de Google, el ID debe ser "APLICACIÓN WEB".
// 2. En "Orígenes de JavaScript autorizados" añade: http://localhost  Y  http://localhost:5173
// 3. Ejecuta la app con "npm run dev", no abras el archivo HTML directamente.

export const GOOGLE_CLIENT_ID = '749366523850-nlrq43947vkk7bg0mvhop5p3pcmcriup.apps.googleusercontent.com';

const SCOPES = 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly https://www.googleapis.com/auth/classroom.coursework.students.readonly https://www.googleapis.com/auth/classroom.rosters.readonly';

export const isGoogleConfigured = () => {
    return GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com') && !GOOGLE_CLIENT_ID.includes('TU_CLIENT_ID');
};

export const getGoogleAccessToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!isGoogleConfigured()) {
            return reject(new Error('Configuración incompleta: El ID de cliente no es válido.'));
        }

        // @ts-ignore
        if (typeof window.google === 'undefined' || !window.google.accounts) {
            return reject(new Error('La librería de Google no ha cargado. Verifica tu conexión a internet.'));
        }

        // Bloqueo de protocolo local: Google no permite OAuth desde file://
        if (window.location.protocol === 'file:') {
            return reject(new Error('Google no permite iniciar sesión desde un archivo local. Debes ejecutar la app con "npm run dev" para usar http://localhost.'));
        }

        try {
            // @ts-ignore
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: (response: any) => {
                    if (response.error) {
                        console.error('Error de Google Auth:', response);
                        reject(new Error(`Error de Google: ${response.error_description || response.error}`));
                    } else {
                        resolve(response.access_token);
                    }
                },
            });
            
            // Forzamos select_account para limpiar estados de error previos en el navegador
            client.requestAccessToken({ prompt: 'select_account' });
        } catch (err) {
            console.error('Excepción al iniciar login:', err);
            reject(err);
        }
    });
};

export const fetchClassroomCourses = async (token: string) => {
    const response = await fetch('https://classroom.googleapis.com/v1/courses?teacherId=me', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Error al obtener cursos de Classroom.');
    const data = await response.json();
    return data.courses || [];
};

export const fetchCourseWork = async (token: string, courseId: string) => {
    const response = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.courseWork || [];
};

export const fetchSubmissions = async (token: string, courseId: string, courseWorkId: string) => {
    const response = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.studentSubmissions || [];
};

export const fetchStudentProfiles = async (token: string, courseId: string) => {
    const response = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.students || [];
}