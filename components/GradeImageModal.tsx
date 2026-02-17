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
            const canvas = await html2canvas(tableRef.current, { 
                scale: 3, // Mayor resolución
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true,
                allowTaint: true,
                scrollX: 0,
                scrollY: 0,
                width: tableRef.current.scrollWidth,
                height: tableRef.current.scrollHeight
            });
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
            const canvas = await html2canvas(tableRef.current, { 
                scale: 3,
                backgroundColor: '#ffffff',
                useCORS: true,
                width: tableRef.current.scrollWidth,
                height: tableRef.current.scrollHeight
            });
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
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Generando PDF...', type: 'info' } });
        try {
            const canvas = await html2canvas(tableRef.current, { 
                scale: 2, 
                backgroundColor: '#ffffff',
                useCORS: true,
                width: tableRef.current.scrollWidth,
                height: tableRef.current.scrollHeight
            });
            const orientation = canvas.width > canvas.height ? 'l' : 'p';
            const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const ratio = pdfWidth / canvas.width;
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, canvas.height * ratio, undefined, 'FAST');
            
            const blob = pdf.output('blob');
            const filename = `calificaciones_${group.name}_${viewMode}.pdf`;
            await saveOrShareFile(blob, filename);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'PDF generado.', type: 'success' } });
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
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                        <button onClick={() => setViewMode('p1')} className={`px-4 py-1.5 rounded-md text-xs font-black transition-all ${viewMode === 'p1' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>P1</button>
                        <button onClick={() => setViewMode('p2')} className={`px-4 py-1.5 rounded-md text-xs font-black transition-all ${viewMode === 'p2' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>P2</button>
                        <button onClick={() => setViewMode('final')} className={`px-4 py-1.5 rounded-md text-xs font-black transition-all ${viewMode === 'final' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>FINAL</button>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={handleCopy} title="Copiar al portapapeles" className="!text-[10px]"><Icon name="copy" className="w-3.5 h-3.5"/> Copiar</Button>
                        <Button size="sm" variant="secondary" onClick={handleDownloadPDF} title="Descargar como PDF" className="!text-[10px]"><Icon name="file-spreadsheet" className="w-3.5 h-3.5"/> PDF</Button>
                        <Button size="sm" onClick={handleDownload} title="Descargar como PNG" className="!text-[10px]"><Icon name="download-cloud" className="w-3.5 h-3.5"/> PNG</Button>
                    </div>
                </div>

                <div className="overflow-auto bg-slate-200 p-2 rounded-xl border border-slate-300 shadow-inner max-h-[60vh] custom-scrollbar">
                    {/* Se eliminó sticky de todas las celdas para evitar errores de html2canvas */}
                    <div ref={tableRef} className="bg-white p-8 w-max text-slate-800">
                        <div className="mb-6 border-b-4 border-indigo-600 pb-3 flex justify-between items-end">
                            <div>
                                <h2 className="text-4xl font-black text-indigo-700 tracking-tight leading-none mb-1">{group.name}</h2>
                                <p className="text-base text-slate-500 font-bold uppercase tracking-widest">{group.subject}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-black text-white bg-indigo-600 px-4 py-1.5 rounded-full uppercase tracking-[0.2em]">
                                    {viewMode === 'final' ? 'Promedios Finales' : viewMode === 'p1' ? 'Parcial 1' : 'Parcial 2'}
                                </p>
                            </div>
                        </div>

                        <table className="border-collapse table-auto">
                            <thead>
                                <tr className="border-b-2 border-slate-300 bg-slate-50">
                                    <th className="p-4 text-left font-black text-slate-600 uppercase text-[12px] min-w-[220px]">Alumno</th>
                                    {viewMode !== 'final' && partialEvaluations.map(ev => (
                                        <th key={ev.id} className="p-2 text-center font-bold text-slate-500 text-[10px] uppercase border-l border-slate-100 min-w-[70px] max-w-[100px]">
                                            <div className="line-clamp-2 leading-tight">{ev.name}</div>
                                            <div className="font-black text-[9px] opacity-40 mt-1">({ev.maxScore})</div>
                                        </th>
                                    ))}
                                    {viewMode === 'p1' && p1Attendance && <th className="p-3 text-center font-bold text-emerald-600 text-[10px] uppercase border-l border-slate-100">Asist.</th>}
                                    {viewMode === 'p2' && p2Attendance && <th className="p-3 text-center font-bold text-emerald-600 text-[10px] uppercase border-l border-slate-100">Asist.</th>}
                                    
                                    {viewMode === 'final' ? (
                                        <>
                                            <th className="p-3 text-center font-bold text-slate-500 uppercase text-[10px] border-l border-slate-200">Asist %</th>
                                            <th className="p-3 text-center font-bold text-slate-500 uppercase text-[10px] border-l border-slate-100">P1</th>
                                            <th className="p-3 text-center font-bold text-slate-500 uppercase text-[10px] border-l border-slate-100">P2</th>
                                            <th className="p-4 text-center font-black text-white bg-indigo-700 uppercase text-[12px] border-l-2 border-indigo-800 min-w-[110px]">Promedio</th>
                                        </>
                                    ) : (
                                        <th className="p-4 text-center font-black text-white bg-indigo-700 uppercase text-[12px] border-l-2 border-indigo-800 min-w-[110px]">Promedio</th>
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
                                    const tolerance = 5;
                                    const isCriticalFail = globalAtt < (settings.lowAttendanceThreshold - tolerance);
                                    const isRisk = globalAtt < settings.lowAttendanceThreshold && !isCriticalFail;
                                    
                                    let finalAvg: number | null = null;
                                    if (p1Avg !== null && p2Avg !== null) finalAvg = (p1Avg + p2Avg) / 2;
                                    else if (p1Avg !== null) finalAvg = p1Avg; else if (p2Avg !== null) finalAvg = p2Avg;
                                    
                                    const showFailAlert = isCriticalFail && settings.failByAttendance;
                                    const showInfoAlert = (isCriticalFail && !settings.failByAttendance) || isRisk;

                                    return (
                                        <tr key={student.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} ${showFailAlert ? 'bg-rose-50' : showInfoAlert ? 'bg-amber-50' : ''}`}>
                                            <td className="p-3 font-bold text-slate-700 border-r border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] text-slate-300 w-5 inline-block text-right">{idx + 1}.</span>
                                                    <div className="flex flex-col">
                                                        <span className={showFailAlert ? 'text-rose-700' : showInfoAlert ? 'text-amber-700' : ''}>{student.name}</span>
                                                        {student.nickname && <span className="text-[9px] text-indigo-400 italic font-bold">"{student.nickname}"</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {viewMode !== 'final' && partialEvaluations.map(ev => (
                                                <td key={ev.id} className="p-2 text-center text-slate-600 font-medium border-l border-slate-50">
                                                    {grades[student.id]?.[ev.id] ?? '-'}
                                                </td>
                                            ))}
                                            
                                            {(viewMode === 'p1' && p1Attendance) && (
                                                <td className={`p-2 text-center font-black border-l border-slate-100 ${p1AttNote < attThresholdNote ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {p1AttNote.toFixed(1)}
                                                </td>
                                            )}
                                            {(viewMode === 'p2' && p2Attendance) && (
                                                <td className={`p-2 text-center font-black border-l border-slate-100 ${p2AttNote < attThresholdNote ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {p2AttNote.toFixed(1)}
                                                </td>
                                            )}
                                            
                                            {viewMode === 'final' ? (
                                                <>
                                                    <td className={`p-3 text-center font-black border-l border-slate-200 ${showFailAlert ? 'text-rose-600' : showInfoAlert ? 'text-amber-600' : 'text-slate-400'}`}>
                                                        {globalAtt.toFixed(0)}%
                                                    </td>
                                                    <td className={`p-3 text-center font-bold border-l border-slate-100 ${getGradeColor(p1Avg)}`}>
                                                        {p1Avg?.toFixed(1) || '-'}
                                                    </td>
                                                    <td className={`p-3 text-center font-bold border-l border-slate-100 ${getGradeColor(p2Avg)}`}>
                                                        {p2Avg?.toFixed(1) || '-'}
                                                    </td>
                                                    <td className={`p-4 text-center font-black text-lg border-l-2 border-indigo-200 bg-indigo-50/50 ${showFailAlert ? 'text-rose-600' : getGradeColor(finalAvg)}`}>
                                                        {finalAvg?.toFixed(1) || '-'}
                                                    </td>
                                                </>
                                            ) : (
                                                <td className={`p-4 text-center font-black text-lg border-l-2 border-indigo-200 bg-indigo-50/50 ${getGradeColor(viewMode === 'p1' ? p1Avg : p2Avg)}`}>
                                                    {(viewMode === 'p1' ? p1Avg : p2Avg)?.toFixed(1) || '-'}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        
                        <div className="mt-8 pt-4 border-t-2 border-slate-100 flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">IAEV Académico</span>
                                <span className="text-[10px] text-slate-300 italic font-bold">Generado: {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-indigo-400 uppercase">Sistema de Gestión de Calificaciones</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-between items-center mt-2 px-2">
                    <p className="text-[10px] text-slate-400 font-bold italic">
                        <Icon name="info" className="w-3 h-3 inline mr-1" />
                        Tip: Si tienes muchas columnas, usa el botón "PDF" para asegurar que nada se corte.
                    </p>
                    <Button variant="secondary" size="sm" onClick={onClose} className="!text-[10px]">Cerrar Captura</Button>
                </div>
            </div>
        </Modal>
    );
};

export default GradeImageModal;