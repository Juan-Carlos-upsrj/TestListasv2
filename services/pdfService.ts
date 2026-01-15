
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Group, Evaluation, GroupReportSummary, AttendanceStatus, Settings } from '../types';
import PdfTemplate from '../components/PdfTemplate';
import { getImageAsBase64 } from './imageUtils';

/**
 * Renders a React component into an off-screen div and captures it as an HTMLCanvasElement.
 */
const componentToCanvas = async (component: React.ReactElement): Promise<HTMLCanvasElement> => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    
    await new Promise<void>((resolve) => {
        root.render(React.createElement(React.StrictMode, null, component));
        setTimeout(resolve, 800); // Increased delay for charts to render fully
    });

    const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
    });

    root.unmount();
    document.body.removeChild(container);

    return canvas;
};

/**
 * Core logic to generate a jsPDF instance for a group report.
 */
const preparePDFInstance = async (
    group: Group,
    groupSummary: GroupReportSummary,
    classDates: string[],
    groupAttendance: { [studentId: string]: { [date: string]: AttendanceStatus; }; },
    attendanceHeaders: Record<string, Record<string, string[]>> | null,
    groupEvaluations: Evaluation[],
    settings: Settings
): Promise<jsPDF> => {
    const logoBase64 = await getImageAsBase64('logo.png');

    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // --- PASS 1: SUMMARY ---
    const summaryTemplate = React.createElement(PdfTemplate, { 
        group, groupSummary, classDates, groupAttendance,
        attendanceHeaders, groupEvaluations, logoBase64,
        professorName: settings.professorName,
        renderPart: 'summary'
    });
    
    const summaryCanvas = await componentToCanvas(summaryTemplate);
    const summaryRatio = pdfWidth / summaryCanvas.width;
    const summaryHeightInPdf = summaryCanvas.height * summaryRatio;
    
    const summaryImgData = summaryCanvas.toDataURL('image/png');
    pdf.addImage(summaryImgData, 'PNG', 0, 0, pdfWidth, summaryHeightInPdf, undefined, 'FAST');
    
    // --- PASS 2: GRID ---
    pdf.addPage();
    
    const gridTemplate = React.createElement(PdfTemplate, { 
        group, groupSummary, classDates, groupAttendance,
        attendanceHeaders, groupEvaluations, logoBase64,
        professorName: settings.professorName,
        renderPart: 'grid'
    });
    
    const gridCanvas = await componentToCanvas(gridTemplate);
    const gridRatio = pdfWidth / gridCanvas.width;
    const gridHeightInPdf = gridCanvas.height * gridRatio;
    
    const totalGridPages = Math.ceil(gridHeightInPdf / pdfHeight);

    for (let i = 0; i < totalGridPages; i++) {
        if (i > 0) pdf.addPage();
        
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        if (!pageCtx) continue;

        const sliceHeightOnCanvas = pdfHeight / gridRatio;
        pageCanvas.width = gridCanvas.width;
        pageCanvas.height = sliceHeightOnCanvas;
        
        const srcY = i * sliceHeightOnCanvas;
        pageCtx.drawImage(gridCanvas, 0, srcY, gridCanvas.width, sliceHeightOnCanvas, 0, 0, gridCanvas.width, sliceHeightOnCanvas);
        
        const pageDataUrl = pageCanvas.toDataURL('image/png');
        pdf.addImage(pageDataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }

    return pdf;
};

export const generateReportPDFBlob = async (
    group: Group,
    groupSummary: GroupReportSummary,
    classDates: string[],
    groupAttendance: { [studentId: string]: { [date: string]: AttendanceStatus; }; },
    attendanceHeaders: Record<string, Record<string, string[]>> | null,
    groupEvaluations: Evaluation[],
    settings: Settings
): Promise<Blob> => {
    const pdf = await preparePDFInstance(group, groupSummary, classDates, groupAttendance, attendanceHeaders, groupEvaluations, settings);
    return pdf.output('blob');
};

export const exportReportToPDF = async (
    group: Group,
    groupSummary: GroupReportSummary,
    classDates: string[],
    groupAttendance: { [studentId: string]: { [date: string]: AttendanceStatus; }; },
    attendanceHeaders: Record<string, Record<string, string[]>> | null,
    groupEvaluations: Evaluation[],
    settings: Settings,
    fileName?: string
) => {
    const pdf = await preparePDFInstance(group, groupSummary, classDates, groupAttendance, attendanceHeaders, groupEvaluations, settings);
    const finalName = fileName ? `${fileName}.pdf` : `reporte_${group.name.replace(/\s/g, '_')}.pdf`;
    pdf.save(finalName);
};
