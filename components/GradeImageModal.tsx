import React, { useState, useRef, useContext, useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import { Group, Evaluation, Settings, AttendanceStatus } from '../types';
import { calculatePartialAverage, getGradeColor, calculateAttendancePercentage } from '../services/gradeCalculation';
import { AppContext } from '../context/AppContext';
import { saveOrShareFile } from '../services/fileUtils';

interface GradeImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: Group;
    evaluations: Evaluation[];
    grades: { [studentId: string]: { [evaluationId: string]: number | null } };
    attendance: { [studentId: string]: { [date: string]: AttendanceStatus } };
    settings: Settings;
}

const GradeImageModal: React.FC<GradeImageModalProps> = ({ 
    isOpen, onClose, group, evaluations, grades, attendance, settings 
}) => {
    const { dispatch } = useContext(AppContext);
    const [viewMode, setViewMode] = useState<'p1' | 'p2' | 'final'>('p1');
    const tableRef = useRef<HTMLDivElement>(null);

    const handleCopy = async () => {
        if (!tableRef.current) return;
        try {
            const canvas = await html2canvas(tableRef.current, { scale: 2, backgroundColor: '#ffffff' });
            canvas.toBlob(blob => {
                if (blob) {
                    navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    dispatch({ type: 'ADD_TOAST', payload: { message: 'Imagen copiada al portapapeles', type: 'success' } });
                }
            });
        } catch (err) {
            console.error(err);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al copiar imagen', type: 'error' } });
        }
    };

    const handleDownload = async () => {
        if (!tableRef.current) return;
        try {
            const canvas = await html2canvas(tableRef.current, { scale: 2, backgroundColor: '#ffffff' });
            const filename = `calificaciones_${group.name}_${viewMode}.png`;
            canvas.toBlob(async (blob) => {
                if (blob) {
                    await saveOrShareFile(blob, filename);
                }
            }, 'image/png');
        } catch (err) {
            console.error(err);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al procesar imagen', type: 'error' } });
        }
    };

    const handleDownloadPDF = async () => {
        if (!tableRef.current) return;
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Generando PDF, por favor espera...', type: 'info' } });
    
        try {
            const canvas = await html2canvas(tableRef.current, { scale: 2, backgroundColor: '#ffffff' });
            
            const orientation = canvas.width > canvas.height ? 'l' : 'p';
            const pdf = new jsPDF({
                orientation,
                unit: 'pt',
                format: 'a4',
            });
    
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const ratio = pdfWidth / canvas.width;
            const totalPdfHeight = canvas.height * ratio;
    
            let position = 0;
            let pageCount = 0;
    
            while (position < totalPdfHeight) {
                if (pageCount > 0) {
                    pdf.addPage();
                }

                const sliceHeightOnCanvas = pdfHeight / ratio;
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = sliceHeightOnCanvas;
                const pageCtx = pageCanvas.getContext('2d');
                
                if (!pageCtx) continue;
    
                pageCtx.drawImage(canvas, 0, position / ratio, canvas.width, sliceHeightOnCanvas, 0, 0, canvas.width, sliceHeightOnCanvas);
                const pageDataUrl = pageCanvas.toDataURL('image/png');
    
                pdf.addImage(pageDataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
                
                position += pdfHeight;
                pageCount++;
            }
            
            const blob = pdf.output('blob');
            const filename = `calificaciones_${group.name}_${viewMode}.pdf`;
            await saveOrShareFile(blob, filename);
            
            dispatch({ type: 'ADD_TOAST', payload: { message: 'PDF generado con éxito.', type: 'success' } });
    
        } catch (err) {
            console.error(err);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Error al generar el PDF.', type: 'error' } });
        }
    };

    const partialEvaluations = evaluations.filter(e => e.partial === (viewMode === 'p1' ? 1 : 2));
    const p1Attendance = group.evaluationTypes.partial1.find(t => t.isAttendance);
    const p2Attendance = group.evaluationTypes.partial2.find(t => t.isAttendance);
    const attThresholdNote = useMemo(() => (settings.lowAttendanceThreshold || 80) / 10, [settings.lowAttendanceThreshold]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Captura de Calificaciones" size="xl">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setViewMode('p1')}
                            className={`px-3 py-1 rounded-md text-sm font-semibold ${viewMode === 'p1' ? 'bg-primary text-white' : 'bg-surface-secondary text-text-secondary'}`}
                        >
                            Parcial 1
                        </button>
                        <button 
                            onClick={() => setViewMode('p2')}
                            className={`px-3 py-1 rounded-md text-sm font-semibold ${viewMode === 'p2' ? 'bg-primary text-white' : 'bg-surface-secondary text-text-secondary'}`}
                        >
                            Parcial 2
                        </button>
                        <button 
                            onClick={() => setViewMode('final')}
                            className={`px-3 py-1 rounded-md text-sm font-semibold ${viewMode === 'final' ? 'bg-primary text-white' : 'bg-surface-secondary text-text-secondary'}`}
                        >
                            Final
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={handleCopy}>
                            <Icon name="copy" className="w-4 h-4"/> Copiar Imagen
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleDownload}>
                            <Icon name="download-cloud" className="w-4 h-4"/> Guardar/Compartir PNG
                        </Button>
                        <Button size="sm" onClick={handleDownloadPDF}>
                            <Icon name="download-cloud" className="w-4 h-4"/> Guardar/Compartir PDF
                        </Button>
                    </div>
                </div>

                <div className="overflow-auto bg-slate-100 p-4 rounded-lg border border-border-color flex justify-center">
                    <div ref={tableRef} className="bg-white p-6 rounded-none shadow-none min-w-[600px] text-slate-800">
                        <div className="mb-4 border-b-2 border-indigo-500 pb-2">
                            <h2 className="text-2xl font-bold text-indigo-700">{group.name}</h2>
                            <p className="text-sm text-slate-500 font-semibold">{group.subject}</p>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
                                {viewMode === 'final' ? 'Promedios Finales' : viewMode === 'p1' ? 'Reporte Primer Parcial' : 'Reporte Segundo Parcial'}
                            </p>
                        </div>

                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-slate-300">
                                    <th className="p-2 text-left font-bold text-slate-600">Alumno</th>
                                    {viewMode !== 'final' && partialEvaluations.map(ev => (
                                        <th key={ev.id} className="p-2 text-center font-semibold text-slate-600 text-xs">
                                            {ev.name} <br/><span className="font-normal opacity-70">({ev.maxScore})</span>
                                        </th>
                                    ))}
                                    {viewMode === 'p1' && p1Attendance && <th className="p-2 text-center font-semibold text-emerald-600 text-xs">Asist..</th>}
                                    {viewMode === 'p2' && p2Attendance && <th className="p-2 text-center font-semibold text-emerald-600 text-xs">Asist.</th>}
                                    
                                    {viewMode === 'final' ? (
                                        <>
                                            <th className="p-2 text-center font-bold text-slate-600">Asist %</th>
                                            <th className="p-2 text-center font-bold text-slate-600">Parcial 1</th>
                                            <th className="p-2 text-center font-bold text-slate-600">Parcial 2</th>
                                            <th className="p-2 text-center font-bold text-indigo-700">Promedio</th>
                                        </>
                                    ) : (
                                        <th className="p-2 text-center font-bold text-indigo-700 bg-indigo-50">Promedio</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {group.students.map((student, idx) => {
                                    const studentAtt = attendance[student.id] || {};
                                    const p1Avg = calculatePartialAverage(group, 1, evaluations, grades[student.id] || {}, settings, studentAtt);
                                    const p2Avg = calculatePartialAverage(group, 2, evaluations, grades[student.id] || {}, settings, studentAtt);
                                    
                                    const p1AttNote = calculateAttendancePercentage(group, 1, settings, studentAtt) / 10;
                                    const p2AttNote = calculateAttendancePercentage(group, 2, settings, studentAtt) / 10;
                                    const globalAtt = calculateAttendancePercentage(group, 'global', settings, studentAtt);
                                    const isLowAtt = globalAtt < settings.lowAttendanceThreshold;

                                    let finalAvg: number | null = null;
                                    if (p1Avg !== null && p2Avg !== null) finalAvg = (p1Avg + p2Avg) / 2;
                                    else if (p1Avg !== null) finalAvg = p1Avg;
                                    else if (p2Avg !== null) finalAvg = p2Avg;

                                    return (
                                        <tr key={student.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-slate-50/50' : ''} ${isLowAtt ? 'bg-rose-50' : ''}`}>
                                            <td className="p-2 font-medium text-slate-700">
                                                <div className="flex items-center gap-1">
                                                    <span className={isLowAtt ? 'text-rose-700 font-bold' : ''}>{student.name}</span>
                                                    {isLowAtt && <span className="text-[7px] font-black bg-rose-600 text-white px-1 rounded-sm uppercase tracking-tighter shrink-0">Baja Asist.</span>}
                                                </div>
                                            </td>

                                            {viewMode !== 'final' && partialEvaluations.map(ev => (
                                                <td key={ev.id} className="p-2 text-center text-slate-600">
                                                    {grades[student.id]?.[ev.id] ?? '-'}
                                                </td>
                                            ))}
                                            
                                            {(viewMode === 'p1' && p1Attendance) && <td className={`p-2 text-center font-bold ${p1AttNote < attThresholdNote ? 'text-rose-600' : 'text-emerald-600'}`}>{p1AttNote.toFixed(1)}</td>}
                                            {(viewMode === 'p2' && p2Attendance) && <td className={`p-2 text-center font-bold ${p2AttNote < attThresholdNote ? 'text-rose-600' : 'text-emerald-600'}`}>{p2AttNote.toFixed(1)}</td>}

                                            {viewMode === 'final' ? (
                                                <>
                                                    <td className={`p-2 text-center font-black ${isLowAtt ? 'text-rose-600' : 'text-slate-400'}`}>{globalAtt.toFixed(0)}%</td>
                                                    <td className={`p-2 text-center font-bold ${getGradeColor(p1Avg)}`}>{p1Avg?.toFixed(1) || '-'}</td>
                                                    <td className={`p-2 text-center font-bold ${getGradeColor(p2Avg)}`}>{p2Avg?.toFixed(1) || '-'}</td>
                                                    <td className={`p-2 text-center font-black text-lg ${isLowAtt ? 'text-rose-600' : getGradeColor(finalAvg)}`}>
                                                        {finalAvg?.toFixed(1) || '-'}
                                                    </td>
                                                </>
                                            ) : (
                                                <td className={`p-2 text-center font-bold bg-indigo-50 ${getGradeColor(viewMode === 'p1' ? p1Avg : p2Avg)}`}>
                                                    {(viewMode === 'p1' ? p1Avg : p2Avg)?.toFixed(1) || '-'}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-xs text-slate-400">Generado el {new Date().toLocaleDateString()}</span>
                            <span className="text-xs font-bold text-indigo-700">Gestión IAEV</span>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default GradeImageModal;