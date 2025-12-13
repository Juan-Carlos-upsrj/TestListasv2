import React from 'react';
import { Group, Evaluation, GroupReportSummary, AttendanceStatus } from '../types';
import { GROUP_COLORS, STATUS_STYLES } from '../constants';
import ReportChart from './ReportChart';

interface GroupPdfTemplateProps {
  group: Group;
  groupSummary: GroupReportSummary;
  classDates: string[];
  groupAttendance: { [studentId: string]: { [date: string]: AttendanceStatus; }; };
  attendanceHeaders: Record<string, Record<string, string[]>> | null;
  groupEvaluations: Evaluation[];
  logoBase64: string;
  professorName: string;
  renderPart: 'summary' | 'grid';
}

const PdfTemplate: React.FC<GroupPdfTemplateProps> = ({ 
  group, 
  groupSummary, 
  classDates, 
  groupAttendance, 
  attendanceHeaders, 
  groupEvaluations, 
  logoBase64,
  professorName,
  renderPart
}) => {
  
  const groupColor = GROUP_COLORS.find(c => c.name === group.color) || GROUP_COLORS[0];

  return (
    <div className="bg-white font-sans text-slate-800" style={{ width: '297mm', minHeight: 'auto', boxSizing: 'border-box' }}>
      <div className="p-10">
        {renderPart === 'summary' && (
          <>
            {/* Header */}
            <header className={`p-6 rounded-xl ${groupColor.bg} ${groupColor.text}`}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {logoBase64 && <img src={logoBase64} alt="Logo" style={{ width: '48px', height: '48px' }} />}
                        <div>
                            <h1 className="text-3xl font-bold">Reporte de Grupo</h1>
                            <p className="opacity-80 text-base">Grupo: {group.name}</p>
                        </div>
                    </div>
                    <div className="text-sm text-right">
                        <p><span className="font-semibold">Materia:</span> {group.subject}</p>
                        <p><span className="font-semibold">Docente:</span> {professorName}</p>
                        <p><span className="font-semibold">Fecha:</span> {new Date().toLocaleDateString('es-ES')}</p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-4 text-center">
                  <div>
                      <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">Alumnos</span>
                      <p className="text-2xl font-bold">{group.students.length}</p>
                  </div>
                  <div>
                      <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">Evaluaciones</span>
                      <p className="text-2xl font-bold">{groupEvaluations.length}</p>
                  </div>
                  <div>
                      <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">Días de Clase</span>
                      <p className="text-2xl font-bold">{classDates.length}</p>
                  </div>
                </div>
            </header>

            <main className="mt-6">
                {/* --- SMALLER CHART --- */}
                <section className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-3 text-center">Asistencia Mensual (Promedio)</h2>
                    <div className="bg-slate-50 p-4 rounded-lg">
                        {groupSummary && Object.keys(groupSummary.monthlyAttendance).length > 0 ? (
                            <ReportChart monthlyAttendance={groupSummary.monthlyAttendance} height="220px" barColor={groupColor.hex} />
                        ) : (
                            <p className="text-center text-slate-500 py-8">No hay datos de asistencia.</p>
                        )}
                    </div>
                </section>
            </main>
          </>
        )}

        {renderPart === 'grid' && (
          <>
            {/* --- Detailed Attendance Grid Page(s) --- */}
            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Registro Detallado de Asistencia</h2>
                <table className="w-full border-collapse text-[7px]">
                  <thead>
                      <tr>
                          <th rowSpan={3} className="p-1 font-semibold border-b-2 border-slate-600 text-center align-bottom w-[20px]">#</th>
                          <th rowSpan={3} className="p-1 text-left font-semibold border-b-2 border-slate-600 align-bottom max-w-[150px]">Alumno</th>
                          {attendanceHeaders && Object.entries(attendanceHeaders).map(([partialName, months]) => {
                              const colspan = Object.values(months).reduce((sum, dates) => sum + dates.length, 0);
                              return <th key={partialName} colSpan={colspan} className="p-1 font-semibold text-center text-base border-b-2 border-slate-600">{partialName}</th>
                          })}
                      </tr>
                      <tr>
                          {attendanceHeaders && Object.entries(attendanceHeaders).flatMap(([, months]) => 
                              Object.entries(months).map(([monthName, dates]) => 
                                  <th key={monthName} colSpan={dates.length} 
                                  className="p-1 font-semibold text-center border-b border-slate-400 bg-slate-50 text-sm">
                                      {monthName}
                                  </th>
                              )
                          )}
                      </tr>
                      <tr>
                          {classDates.map(date => (
                              <th key={date} className="p-1 font-semibold text-center min-w-[20px] border-b border-slate-400 align-bottom">
                                  {new Date(date + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit' })}
                              </th>
                          ))}
                      </tr>
                  </thead>
                  <tbody>
                      {group.students.map((student, index) => (
                          <tr key={student.id} className="border-b border-slate-200">
                              <td className="p-1 text-center border-r border-slate-200">{index + 1}</td>
                              <td className="p-1 text-[9px] max-w-[150px]">
                                  <span className="font-semibold">{student.name}</span>
                              </td>
                              {classDates.map(date => {
                                  const status = groupAttendance[student.id]?.[date] || AttendanceStatus.Pending;
                                  // Use the updated solid colors from STATUS_STYLES
                                  const colorClass = STATUS_STYLES[status].color;
                                  return (
                                      <td key={date} className="p-0 text-center border-l border-slate-200">
                                          <div className={`w-full h-4 flex items-center justify-center font-bold ${colorClass}`}>
                                              {STATUS_STYLES[status].symbol}
                                          </div>
                                      </td>
                                  );
                              })}
                          </tr>
                      ))}
                  </tbody>
              </table>
               <footer className="mt-12 text-center text-xs text-slate-500 pt-4" style={{ breakInside: 'avoid' }}>
                    <div style={{width: '250px', margin: '0 auto 4px auto', borderTop: '1px solid #64748b'}}></div>
                    <p className="text-sm font-semibold text-slate-800">{professorName}</p>
                </footer>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default PdfTemplate;