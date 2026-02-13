// CLIENT_ID debe configurarse en Google Cloud Console para que funcione en producción.
const CLIENT_ID = 'TU_CLIENT_ID_DE_GOOGLE.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly https://www.googleapis.com/auth/classroom.coursework.students.readonly';

export const getGoogleAccessToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        // En un entorno Electron/Web, usamos el flujo de Identity Services
        // @ts-ignore
        const client = window.google?.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response: any) => {
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response.access_token);
                }
            },
        });
        
        if (client) {
            client.requestAccessToken();
        } else {
            // Fallback para pruebas o si la librería no carga
            const token = localStorage.getItem('google_access_token');
            if (token) resolve(token);
            else reject(new Error('Google Client no inicializado. Asegúrate de incluir la librería de Google en el index.html.'));
        }
    });
};

export const fetchClassroomCourses = async (token: string) => {
    const response = await fetch('https://classroom.googleapis.com/v1/courses?teacherId=me', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
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
};