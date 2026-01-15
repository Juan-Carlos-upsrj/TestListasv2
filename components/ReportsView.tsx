
import React, { useContext, useMemo, useEffect, useCallback, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { AttendanceStatus, GroupReportSummary } from '../types';
import { getClassDates } from '../services/dateUtils';
import { exportAttendanceToCSV, exportGradesToCSV, generateAttendanceCSVContent, generateGradesCSVContent } from '../services/exportService';
import { exportReportToPDF } from '../services/pdfService';
import Icon from './icons/Icon';
import Button from './common/Button';
import ReportChart from './ReportChart';
import { motion } from 'framer-motion';
import { STATUS_STYLES, GROUP_COLORS } from '../constants';
// @ts-ignore
import * as JSZipModule from 'jszip';

// Fix for jszip import inconsistency between dev/prod and ESM/UMD
const JSZip = (JSZipModule as any).default || JSZipModule;

const ReportsView: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { groups, attendance, evaluations, grades, settings, selectedGroupId } = state;
    const [isExportingMassive, setIsExportingMassive] = useState(false);

    const setSelectedGroupId = useCallback((id: string | null) => {
        dispatch({ type: 'SET_SELECTED_GROUP', payload: id });
    }, [dispatch]);

    const group = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
    const groupEvaluations = useMemo(() => (evaluations[selectedGroupId || ''] || []), [evaluations, selectedGroupId]);
    
    // Resolve group color hex
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
        if (group) {
            return getClassDates(settings.semesterStart, settings.semesterEnd, group.classDays);
        }
        return [];
    }, [group, settings.semesterStart, settings.semesterEnd]);

    const attendanceHeaders = useMemo(() => {
        if (!group) return null;

        const partial1End = new Date(settings.firstPartialEnd + 'T00:00:00');
        const grouped: Record<string, Record<string, string[]>> = {};

        classDates.forEach(dateStr => {
            const date = new Date(dateStr + 'T00:00:00');
            const partialName = date <= partial1End ? "Primer Parcial" : "Segundo Parcial";
            const monthName = date.toLocaleDateString('es-MX', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());

            if (!grouped[partialName]) grouped[partialName] = {};
            if (!grouped[partialName][monthName]) grouped[partialName][monthName] = [];
            grouped[partialName][monthName].push(dateStr);
        });
        return grouped;
    }, [group, classDates, settings.firstPartialEnd]);

    const groupSummaryData: GroupReportSummary | null = useMemo(() => {
        if (!group) return null;

        const allSemesterDates = getClassDates(settings.semesterStart, settings.semesterEnd, group.classDays);
        
        const monthlyDates: { [monthYear: string]: string[] } = {};
        allSemesterDates.forEach(d => {
            const dateObj = new Date(d + 'T00:00:00');
            const monthYear = dateObj.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
            if (!monthlyDates[monthYear]) monthlyDates[monthYear] = [];
            monthlyDates[monthYear].push(d);
        });

        const summary: GroupReportSummary = {
            monthlyAttendance: {},
            evaluationAverages: {}
        };

        Object.keys(monthlyDates).forEach(monthYear => {
            const datesInMonth = monthlyDates[monthYear];
            let totalPercentageSum = 0;
            let studentsWithAttendanceThisMonth = 0;

            group.students.forEach(student => {
                const studentAttendance = attendance[group.id]?.[student.id] || {};
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
    }, [group, settings, attendance]);
    
    
    const getExportFileName = useCallback((g?: any) => {
        const targetGroup = g || group;
        if (!targetGroup) return 'reporte';
        
        const cleanString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();

        const start = new Date(settings.semesterStart);
        const end = new Date(settings.semesterEnd);
        
        const startMonth = start.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase().replace('.', '');
        const startYear = start.toLocaleDateString('es-MX', { year: '2-digit' });
        
        const endMonth = end.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase().replace('.', '');
        const endYear = end.toLocaleDateString('es-MX', { year: '2-digit' });
        
        const period = `${startMonth}${startYear}-${endMonth}${endYear}`;
        const subject = cleanString(targetGroup.subject);
        const groupName = cleanString(targetGroup.name);
        
        return `${period}_${subject}_${groupName}`;
    }, [group, settings.semesterStart, settings.semesterEnd]);

    const handleMassiveExport = async () => {
        if (groups.length === 0) return;
        setIsExportingMassive(true);
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Generando archivo ZIP organizado...', type: 'info' } });

        try {
            const zip = new JSZip();
            const rootFolder = zip.folder(`Reportes_IAEV_${new Date().toISOString().split('T')[0]}`);

            for (const g of groups) {
                const quarter = (g.quarter || 'Sin_Cuatrimestre').replace(/[^a-zA-Z0-9]/g, '_');
                const subject = g.subject.replace(/[^a-zA-Z0-9]/g, '_');
                const gName = g.name.replace(/[^a-zA-Z0-9]/g, '_');

                const groupFolder = rootFolder.folder(quarter).folder(subject).folder(gName);

                // Asistencia
                const gDates = getClassDates(settings.semesterStart, settings.semesterEnd, g.classDays);
                const attContent = generateAttendanceCSVContent(g, gDates, attendance[g.id] || {});
                groupFolder.file(`Asistencia_${gName}.csv`, attContent);

                // Calificaciones
                const gEvals = evaluations[g.id] || [];
                const gradesContent = generateGradesCSVContent(g, gEvals, grades[g.id] || {});
                groupFolder.file(`Calificaciones_${gName}.csv`, gradesContent);
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `Reportes_IAEV_Masivo_${new Date().toISOString().split('T')[0]}.zip`;
            link.click();
            
            dispatch({ type: 'ADD_TOAST', payload: { message: '¡Exportación masiva completa!', type: 'success' } });
        } catch (err) {
            console.error(err);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al generar la exportación masiva.', type: 'error' } });
        } finally {
            setIsExportingMassive(false);
        }
    };

    const handleExportAttendance = () => {
        if (group) {
            exportAttendanceToCSV(group, classDates, attendance[group.id] || {}, getExportFileName());
        }
    };

    const handleExportGrades = () => {
        if (group) {
            exportGradesToCSV(group, groupEvaluations, grades[group.id] || {}, getExportFileName());
        }
    };

    const handleExportPDF = () => {
        if (group && groupSummaryData && attendanceHeaders) {
            exportReportToPDF(
                group,
                groupSummaryData,
                classDates,
                attendance[group.id] || {},
                attendanceHeaders,
                groupEvaluations,
                settings,
                getExportFileName()
            );
        } else {
             dispatch({ type: 'ADD_TOAST', payload: { message: 'No hay datos suficientes para generar el PDF.', type: 'error' } });
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
                            {isExportingMassive ? 'Procesando...' : 'Exportación Masiva (ZIP)'}
                        </Button>
                        <Button variant="secondary" onClick={handleExportPDF} className="w-full sm:w-auto">
                            <Icon name="file-spreadsheet" className="w-4 h-4" /> PDF Individual
                        </Button>
                         <Button variant="secondary" onClick={handleExportAttendance} className="w-full sm:w-auto">
                            <Icon name="file-spreadsheet" className="w-4 h-4" /> Asistencia (CSV)
                        </Button>
                        <Button variant="secondary" onClick={handleExportGrades} className="w-full sm:w-auto">
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
