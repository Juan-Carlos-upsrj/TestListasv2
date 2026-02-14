// ID ACTUALIZADO SEGÚN TU CAPTURA:
export const GOOGLE_CLIENT_ID = '749366523850-nlrq43947vkk7bg0mvhop5p3pcmcriup.apps.googleusercontent.com';

const SCOPES = 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly https://www.googleapis.com/auth/classroom.coursework.students.readonly https://www.googleapis.com/auth/classroom.rosters.readonly';

export const isGoogleConfigured = () => {
    return GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com') && !GOOGLE_CLIENT_ID.includes('TU_CLIENT_ID');
};

export const getGoogleAccessToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Validación de ID
        if (!isGoogleConfigured()) {
            return reject(new Error('Configuración incompleta: El ID de cliente no es válido.'));
        }

        // DETECCIÓN DE PROTOCOLO CRÍTICA:
        // Si sale storagerelay://file/ en el error de Google es porque esto es 'file:'
        if (window.location.protocol === 'file:') {
            const errorMsg = '🛑 ERROR DE SEGURIDAD DE GOOGLE:\n\n' +
                           'Estás ejecutando la aplicación desde un archivo local (file://).\n' +
                           'Google prohíbe el inicio de sesión desde archivos locales.\n\n' +
                           'SOLUCIÓN:\n' +
                           '1. Cierra la aplicación.\n' +
                           '2. Ejecuta "npm run dev" en tu terminal.\n' +
                           '3. Asegúrate de que Electron cargue http://localhost:5173';
            
            console.error(errorMsg);
            alert(errorMsg);
            return reject(new Error('Google Auth bloqueado por protocolo local (file://).'));
        }

        // @ts-ignore
        if (typeof window.google === 'undefined' || !window.google.accounts) {
            return reject(new Error('La librería de Google no se ha cargado. Verifica tu conexión a internet.'));
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
            
            // Forzamos selección de cuenta para evitar errores de sesión cacheada
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