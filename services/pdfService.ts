import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Group, Evaluation, GroupReportSummary, AttendanceStatus, Settings } from '../types';
import PdfTemplate from '../components/PdfTemplate';
import { getImageAsBase64 } from './imageUtils';

/**
 * Renders a React component into an off-screen div and captures it as an HTMLCanvasElement.
 * This is a crucial step for converting complex React components into images for PDF generation.
 * @param component The React element to render.
 * @returns A promise that resolves with the canvas element.
 */
const componentToCanvas = async (component: React.ReactElement): Promise<HTMLCanvasElement> => {
    const container = document.createElement('div');
    // Position it off-screen to avoid any visual disruption
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    
    // Render the component and wait briefly for layout and images to process.
    // This helps ensure html2canvas captures the component in its final state.
    await new Promise<void>((resolve) => {
        root.render(React.createElement(React.StrictMode, null, component));
        setTimeout(resolve, 500); // Small delay for rendering stabilization
    });

    const canvas = await html2canvas(container, {
        scale: 2, // Render at a higher resolution for better PDF quality
        useCORS: true,
    });

    // Clean up the DOM by unmounting the component and removing the container.
    root.unmount();
    document.body.removeChild(container);

    return canvas;
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
    const logoBase64 = await getImageAsBase64('logo.png');

    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // --- PASS 1: RENDER AND ADD SUMMARY PAGE ---
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
    
    // --- FORCE PAGE BREAK AND START PASS 2: RENDER AND ADD GRID PAGE(S) ---
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
    
    // Slice the tall grid canvas into multiple pages as needed.
    const totalGridPages = Math.ceil(gridHeightInPdf / pdfHeight);

    for (let i = 0; i < totalGridPages; i++) {
        if (i > 0) {
            pdf.addPage();
        }
        
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        if (!pageCtx) continue;

        const sliceHeightOnCanvas = pdfHeight / gridRatio;
        
        pageCanvas.width = gridCanvas.width;
        pageCanvas.height = sliceHeightOnCanvas;
        
        const srcY = i * sliceHeightOnCanvas;
        
        // Draw a slice of the full grid canvas onto a temporary canvas for the current page.
        pageCtx.drawImage(gridCanvas, 0, srcY, gridCanvas.width, sliceHeightOnCanvas, 0, 0, gridCanvas.width, sliceHeightOnCanvas);
        
        const pageDataUrl = pageCanvas.toDataURL('image/png');
        
        // Add the current page's image to the PDF.
        pdf.addImage(pageDataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }

    const finalName = fileName ? `${fileName}.pdf` : `reporte_${group.name.replace(/\s/g, '_')}.pdf`;
    pdf.save(finalName);
};