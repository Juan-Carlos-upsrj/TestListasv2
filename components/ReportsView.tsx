
import React, { useContext, useMemo, useEffect, useCallback, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { AttendanceStatus, GroupReportSummary, Group } from '../types';
import { getClassDates } from '../services/dateUtils';
import { exportAttendanceToCSV, exportGradesToCSV } from '../services/exportService';
import { exportReportToPDF, generateReportPDFBlob } from '../services/pdfService';
import Icon from './icons/Icon';
import Button from './common/Button';
import ReportChart from './ReportChart';
import { motion } from 'framer-motion';
import { STATUS_STYLES, GROUP_COLORS } from '../constants';

// Helper to load JSZip from CDN dynamically to avoid static build errors in Rollup/Vite
const getJSZip = (): Promise<any> => {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        if (window.JSZip) {
            // @ts-ignore
            return resolve(window.JSZip);
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => {
             // @ts-ignore
            resolve(window.JSZip);
        };
        script.onerror = () => reject(new Error('No se pudo cargar JSZip desde el CDN.'));
        document.head.appendChild(script);
    });
};

const ReportsView: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, attendance, evaluations, grades, settings, selectedGroupId } = state;
    const [isExportingMassive, setIsExportingMassive] = useState(false);
    const [massiveProgress, setMassiveProgress] = useState({ current: 0, total: 0, name: '' });

    const setSelectedGroupId = useCallback((id: string | null) => {
        dispatch({ type: 'SET_SELECTED_GROUP', payload: id });
    }, [dispatch]);

    const group = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
    const groupEvaluations = useMemo(() => (evaluations[selectedGroupId || ''] || []), [evaluations, selectedGroupId]);
    
    const groupColorHex = useMemo(() => {
        if (!group) return undefined;
        const colorObj = GROUP_COLORS.find(c => c.name === group.color) || GROUP_COLORS[0];
        return colorObj.hex;
    }, [group]);

    useEffect(() => {
        if (!selectedGroupId && groups.length > 0) {
            setSelectedGroupId(groups[0].id);
        }
    }, [groups, selectedGroupId, setSelectedGroupId]);

    const classDates = useMemo(() => {
        if (group) return getClassDates(settings.semesterStart, settings.semesterEnd, group.classDays);
        return [];
    }, [group, settings.semesterStart, settings.semesterEnd]);

    const getAttendanceHeaders = (g: Group) => {
        const partial1End = new Date(settings.p1EvalEnd + 'T00:00:00');
        const grouped: Record<string, Record<string, string[]>> = {};
        const gDates = getClassDates(settings.semesterStart, settings.semesterEnd, g.classDays);

        gDates.forEach(dateStr => {
            const date = new Date(dateStr + 'T00:00:00');
            const partialName = date <= partial1End ? "Primer Parcial" : "Segundo Parcial";
            const monthName = date.toLocaleDateString('es-MX', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());

            if (!grouped[partialName]) grouped[partialName] = {};
            if (!grouped[partialName][monthName]) grouped[partialName][monthName] = [];
            grouped[partialName][monthName].push(dateStr);
        });
        return grouped;
    };

    const getSummaryData = (g: Group): GroupReportSummary => {
        const allSemesterDates = getClassDates(settings.semesterStart, settings.semesterEnd, g.classDays);
        const monthlyDates: { [monthYear: string]: string[] } = {};
        allSemesterDates.forEach(d => {
            const dateObj = new Date(d + 'T00:00:00');
            const monthYear = dateObj.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
            if (!monthlyDates[monthYear]) monthlyDates[monthYear] = [];
            monthlyDates[monthYear].push(d);
        });

        const summary: GroupReportSummary = { monthlyAttendance: {}, evaluationAverages: {} };
        Object.keys(monthlyDates).forEach(monthYear => {
            const datesInMonth = monthlyDates[monthYear];
            let totalPercentageSum = 0;
            let studentsWithAttendanceThisMonth = 0;

            g.students.forEach(student => {
                const studentAttendance = attendance[g.id]?.[student.id] || {};
                let present = 0;
                let validAttendanceTaken = 0;
                datesInMonth.forEach(date => {
                    const status = studentAttendance[date];
                    if (status === AttendanceStatus.Present || status === AttendanceStatus.Late || status === AttendanceStatus.Justified || status === AttendanceStatus.Exchange) {
                        present++;
                        validAttendanceTaken++;
                    } else if (status === AttendanceStatus.Absent) {
                        validAttendanceTaken++;
                    }
                });
                if (validAttendanceTaken > 0) {
                    totalPercentageSum += (present / validAttendanceTaken) * 100;
                    studentsWithAttendanceThisMonth++;
                }
            });
            if (studentsWithAttendanceThisMonth > 0) {
                summary.monthlyAttendance[monthYear] = totalPercentageSum / studentsWithAttendanceThisMonth;
            }
        });
        return summary;
    };
    
    const attendanceHeaders = useMemo(() => group ? getAttendanceHeaders(group) : null, [group, settings.p1EvalEnd]);
    const groupSummaryData = useMemo(() => group ? getSummaryData(group) : null, [group, settings, attendance]);

    const handleMassiveExport = async () => {
        if (groups.length === 0) return;
        setIsExportingMassive(true);
        setMassiveProgress({ current: 0, total: groups.length, name: '' });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Iniciando generación masiva de PDFs...', type: 'info' } });

        try {
            const JSZipConstructor = await getJSZip();
            const zip = new JSZipConstructor();
            const rootFolder = zip.folder(`Reportes_IAEV_PDF_${new Date().toISOString().split('T')[0]}`);

            for (let i = 0; i < groups.length; i++) {
                const g = groups[i];
                setMassiveProgress({ current: i + 1, total: groups.length, name: g.name });

                const quarter = (g.quarter || 'Sin_Cuatrimestre').replace(/[^a-zA-Z0-9]/g, '_');
                const subject = g.subject.replace(/[^a-zA-Z0-9]/g, '_');
                const gName = g.name.replace(/[^a-zA-Z0-9]/g, '_');

                const summary = getSummaryData(g);
                const headers = getAttendanceHeaders(g);
                const gDates = getClassDates(settings.semesterStart, settings.semesterEnd, g.classDays);
                const gEvals = evaluations[g.id] || [];

                const pdfBlob = await generateReportPDFBlob(
                    g,
                    summary,
                    gDates,
                    attendance[g.id] || {},
                    headers,
                    gEvals,
                    settings
                );

                const groupFolder = rootFolder.folder(quarter).folder(subject);
                groupFolder.file(`Reporte_${gName}.pdf`, pdfBlob);
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `Reportes_IAEV_Masivo_PDF_${new Date().toISOString().split('T')[0]}.zip`;
            link.click();
            
            dispatch({ type: 'ADD_TOAST', payload: { message: '¡Exportación masiva completa!', type: 'success' } });
        } catch (err) {
            console.error(err);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al generar la exportación masiva.', type: 'error' } });
        } finally {
            setIsExportingMassive(false);
            setMassiveProgress({ current: 0, total: 0, name: '' });
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <select
                    value={selectedGroupId || ''}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full sm:w-64 p-2 border border-border-color rounded-md bg-surface focus:ring-2 focus:ring-primary ml-auto"
                >
                    <option value="" disabled>Selecciona un grupo</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </div>

            {isExportingMassive && (
                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl animate-pulse flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Icon name="download-cloud" className="w-6 h-6 text-indigo-600" />
                        <div>
                            <p className="text-sm font-bold text-indigo-900">Generando PDFs ({massiveProgress.current} de {massiveProgress.total})</p>
                            <p className="text-xs text-indigo-700">Procesando: <span className="font-black">{massiveProgress.name}</span></p>
                        </div>
                    </div>
                    <div className="text-indigo-800 font-bold text-xl">{Math.round((massiveProgress.current / massiveProgress.total) * 100)}%</div>
                </div>
            )}

            {group ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex flex-wrap justify-start md:justify-end gap-3 mb-4">
                        <Button 
                            variant="secondary" 
                            onClick={handleMassiveExport} 
                            disabled={isExportingMassive}
                            className="w-full sm:w-auto bg-indigo-600 !text-white hover:bg-indigo-700 shadow-md"
                        >
                            <Icon name="download-cloud" className="w-4 h-4" /> 
                            {isExportingMassive ? 'Exportando...' : 'Exportación Masiva (ZIP-PDF)'}
                        </Button>
                        <Button variant="secondary" onClick={() => exportReportToPDF(group, groupSummaryData!, classDates, attendance[group.id] || {}, attendanceHeaders, groupEvaluations, settings)} className="w-full sm:w-auto">
                            <Icon name="file-spreadsheet" className="w-4 h-4" /> PDF Individual
                        </Button>
                         <Button variant="secondary" onClick={() => exportAttendanceToCSV(group, classDates, attendance[group.id] || {})} className="w-full sm:w-auto">
                            <Icon name="file-spreadsheet" className="w-4 h-4" /> Asistencia (CSV)
                        </Button>
                        <Button variant="secondary" onClick={() => exportGradesToCSV(group, groupEvaluations, grades[group.id] || {})} className="w-full sm:w-auto">
                           <Icon name="file-spreadsheet" className="w-4 h-4" /> Calificaciones (CSV)
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div className="lg:col-span-2 bg-surface p-6 rounded-xl shadow-sm border border-border-color">
                            <h3 className="text-xl font-bold mb-4 text-text-primary">Asistencia Mensual del Grupo</h3>
                            {groupSummaryData && Object.keys(groupSummaryData.monthlyAttendance).length > 0 ? (
                                <ReportChart monthlyAttendance={groupSummaryData.monthlyAttendance} barColor={groupColorHex} />
                            ) : (
                                <p className="text-center text-text-secondary py-8">No hay suficientes datos de asistencia para mostrar el gráfico.</p>
                            )}
                        </div>
                        <div className="lg:col-span-1 bg-surface p-6 rounded-xl shadow-sm border border-border-color flex flex-col justify-center">
                            <h3 className="text-xl font-bold mb-4 text-text-primary">Resumen General</h3>
                            <div className="space-y-4">
                               <div className="flex justify-between items-center">
                                    <span className="font-medium text-text-secondary">Total de Alumnos</span>
                                    <span className="font-bold text-2xl text-primary">{group.students.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-text-secondary">Evaluaciones Creadas</span>
                                    <span className="font-bold text-2xl text-primary">{groupEvaluations.length}</span>
                                </div>
                                 <div className="flex justify-between items-center">
                                    <span className="font-medium text-text-secondary">Días de Clase</span>
                                    <span className="font-bold text-2xl text-primary">{classDates.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-surface p-4 rounded-xl shadow-sm border border-border-color overflow-x-auto">
                        <h3 className="text-xl font-bold mb-4 text-text-primary">Registro Detallado de Asistencia</h3>
                        {group.students.length > 0 ? (
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th rowSpan={3} className="sticky left-0 bg-surface p-2 text-left font-semibold z-10 border-b-2 border-border-color">Alumno</th>
                                        {attendanceHeaders && Object.entries(attendanceHeaders).map(([partialName, months]) => {
                                            const colspan = Object.values(months).reduce((sum, dates) => sum + dates.length, 0);
                                            return <th key={partialName} colSpan={colspan} className="p-2 font-semibold text-center text-lg border-b-2 border-border-color">{partialName}</th>
                                        })}
                                    </tr>
                                    <tr>
                                        {attendanceHeaders && Object.entries(attendanceHeaders).flatMap(([partialName, months]) => 
                                            Object.entries(months).map(([monthName, dates], index) => 
                                                <th key={`${partialName}-${monthName}`} colSpan={dates.length} 
                                                className={`p-2 font-semibold text-center border-b border-border-color ${index % 2 === 0 ? 'bg-surface-secondary/70' : 'bg-surface-secondary/40'}`}>
                                                    {monthName}
                                                </th>
                                            )
                                        )}
                                    </tr>
                                    <tr>
                                        {classDates.map(date => (
                                            <th key={date} className="p-2 font-semibold text-center text-sm min-w-[60px] border-b border-border-color">
                                                {new Date(date + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit' })}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.students.map(student => (
                                        <tr key={student.id} className="border-b border-border-color/70 hover:bg-surface-secondary/40">
                                            <td className="sticky left-0 bg-surface p-2 font-medium z-10 whitespace-nowrap">{student.name} {student.nickname && <span className="font-normal text-text-secondary">({student.nickname})</span>}</td>
                                            {classDates.map(date => {
                                                const status = attendance[group.id]?.[student.id]?.[date] || AttendanceStatus.Pending;
                                                return (
                                                    <td key={date} className="p-0 text-center">
                                                        <div
                                                            className={`w-full h-10 flex items-center justify-center text-xs ${STATUS_STYLES[status].color}`}
                                                        >
                                                            {STATUS_STYLES[status].symbol}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-center text-text-secondary py-8">No hay alumnos en este grupo para generar un reporte.</p>
                        )}
                    </div>
                </motion.div>
            ) : (
                <div className="text-center py-20 bg-surface rounded-xl shadow-sm border border-border-color">
                    <Icon name="bar-chart-3" className="w-20 h-20 mx-auto text-border-color"/>
                    <p className="mt-4 text-text-secondary">Por favor, selecciona un grupo para ver sus reportes.</p>
                    {groups.length === 0 && <p className="text-text-secondary/70">Primero necesitas crear un grupo en la sección 'Grupos'.</p>}
                </div>
            )}
        </div>
    );
};

export default ReportsView;
