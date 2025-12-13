
// @ts-ignore
import { driver } from "driver.js";

export const startTour = () => {
    const driverObj = driver({
        showProgress: true,
        animate: true,
        popoverClass: 'driverjs-theme',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Anterior',
        doneBtnText: '¡Entendido!',
        steps: [
            {
                element: '#sidebar-logo',
                popover: {
                    title: '🎓 Masterclass: Gestión IAEV',
                    description: 'Bienvenido a tu nueva herramienta de control académico. <br/><br/>Este recorrido no solo te mostrará los botones, sino <strong>cómo usarlos estratégicamente</strong> para ahorrar horas de trabajo administrativo.<br/><br/><em>Toma unos minutos para leer los tips.</em>',
                    side: 'right',
                    align: 'start'
                }
            },
            {
                element: '#sidebar-quick-groups',
                popover: {
                    title: '⚡ Navegación por Contexto',
                    description: 'Estos botones son el corazón de la navegación. <br/><br/>Al seleccionar un grupo aquí, <strong>toda la aplicación se filtra</strong> para mostrar solo los datos de ese grupo (Asistencia, Calificaciones, Reportes). <br/><br/>Úsalos para cambiar rápidamente entre clases sin perderte.',
                    side: 'right'
                }
            },
            {
                element: '#dashboard-attendance-widget',
                popover: {
                    title: '📅 Pase de Lista Diario',
                    description: 'Este widget se actualiza automáticamente según el día de la semana. <br/><br/><strong>Tip Pro:</strong> Úsalo al iniciar la clase para tomar asistencia en segundos. Si necesitas editar una fecha anterior, ve a la sección completa de "Asistencia" en el menú.',
                    side: 'right'
                }
            },
            {
                element: '#nav-item-groups',
                popover: {
                    title: '👥 Gestión Inteligente de Grupos',
                    description: 'Aquí configuras tus materias. <br/><br/><strong>Funciones Avanzadas:</strong><br/>🔹 <strong>Duplicar Grupo:</strong> Si das la misma materia a dos grupos (A y B) o el mismo grupo en otra materia, usa el botón de "Copiar" para clonar la lista de alumnos instantáneamente.<br/>🔹 <strong>Importación:</strong> Pega listas desde Excel directamente.',
                    side: 'right'
                }
            },
            {
                element: '#nav-item-attendance',
                popover: {
                    title: '✅ Matriz de Asistencia & IA',
                    description: 'La herramienta más potente. <br/><br/>🤖 <strong>Importar con IA:</strong> ¿Tienes una lista en papel? Tómale una foto, súbela aquí y la IA digitalizará la asistencia por ti.<br/><br/>⌨️ <strong>Atajos de Teclado:</strong><br/>- <strong>P</strong>: Presente<br/>- <strong>A</strong>: Ausente<br/>- <strong>R</strong>: Retardo<br/>- <strong>Flechas</strong>: Moverse por la tabla.',
                    side: 'right'
                }
            },
            {
                element: '#nav-item-grades',
                popover: {
                    title: '📊 Calificaciones Automatizadas',
                    description: 'Configura tus criterios de evaluación (ej. 40% Examen, 60% Proyecto).<br/><br/><strong>Tip Pro:</strong> Al configurar el grupo, puedes añadir un criterio de "Asistencia Automática". El sistema calculará el % de asistencia y lo sumará a la calificación final sin que tengas que hacer nada.',
                    side: 'right'
                }
            },
            {
                element: '#nav-item-reports',
                popover: {
                    title: '📄 Reportes Ejecutivos',
                    description: 'Genera PDFs listos para entregar a coordinación o enviar a alumnos.<br/><br/>Incluye gráficas de rendimiento mensual y un desglose detallado. También puedes exportar a Excel (CSV) si necesitas manipular los datos manualmente.',
                    side: 'right'
                }
            },
            {
                element: '#sidebar-settings',
                popover: {
                    title: '⚙️ Ciclo de Vida del Semestre',
                    description: 'Aquí configuras las fechas de parciales.<br/><br/>🚀 <strong>Asistente de Cierre de Ciclo:</strong><br/>Al terminar el cuatrimestre, busca aquí el botón para "Cerrar Ciclo". El sistema:<br/>1. Creará un respaldo completo.<br/>2. Promoverá los grupos al siguiente nivel (ej. de 4º a 5º).<br/>3. Limpiará las asistencias viejas para empezar de nuevo.',
                    side: 'right',
                    align: 'end'
                }
            }
        ]
    });

    driverObj.drive();
};