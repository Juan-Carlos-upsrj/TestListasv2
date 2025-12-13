import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Group, AttendanceStatus, Student } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import Icon from './icons/Icon';
import ConfirmationModal from './common/ConfirmationModal';

interface AttendanceTextImporterProps {
    isOpen: boolean;
    onClose: () => void;
    group: Group;
}

interface ParsedRecord {
    originalName: string;
    date: string;
    status: AttendanceStatus;
    matchedStudent: Student | null;
}

const normalizeText = (text: string) => {
    return text
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

const AttendanceTextImporter: React.FC<AttendanceTextImporterProps> = ({ isOpen, onClose, group }) => {
    const { state, dispatch } = useContext(AppContext);
    const { settings } = state;
    const [step, setStep] = useState(1); // 1: paste, 2: verify
    const [pastedText, setPastedText] = useState('');
    const [error, setError] = useState('');
    const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);

    const promptText = useMemo(() => {
        const startDate = new Date(settings.semesterStart + 'T00:00:00');
        const endDate = new Date(settings.semesterEnd + 'T00:00:00');

        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        
        let yearInstruction = `Para las fechas, asume que el año es ${startYear}.`;
        
        if (startYear !== endYear) {
            const year1Months = new Set<string>();
            const year2Months = new Set<string>();
            
            let currentDate = new Date(startDate);
            while(currentDate <= endDate) {
                const currentYear = currentDate.getFullYear();
                const currentMonth = currentDate.toLocaleString('es-ES', { month: 'long' });
                if (currentYear === startYear) {
                    year1Months.add(currentMonth);
                } else if (currentYear === endYear) {
                    year2Months.add(currentMonth);
                }
                // Move to the next month safely
                currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
            }
            
            yearInstruction = `El semestre abarca dos años. Para los meses de ${Array.from(year1Months).join(', ')}, usa el año ${startYear}. Para los meses de ${Array.from(year2Months).join(', ')}, usa el año ${endYear}.`;
        }

        return `Actúa como un asistente experto en extracción de datos. Te proporcionaré una imagen de una lista de asistencia. Tu tarea es analizarla y devolver **únicamente un objeto JSON** con la siguiente estructura:

{
  "attendanceRecords": [
    { "studentName": "Nombre Completo del Alumno", "date": "YYYY-MM-DD", "status": "Estado" }
  ]
}

Por favor, sigue estas reglas estrictamente:

1.  **Fechas:** ${yearInstruction} Combina el mes (ej. Septiembre) con el día y el año correspondiente para formar la fecha en formato \`YYYY-MM-DD\`.
2.  **Mapeo de Estado:**
    - Palomita (✓), 'P': "Presente"
    - Cuadro vacío (□), 'A', 'F', 'X': "Ausente"
    - Diagonal (/), Asterisco (*), 'J': "Justificado"
    - 'R', 'T': "Retardo"
    - 'I': "Intercambio"
    - Si una celda está vacía o no es clara, omite ese registro.

Analiza la tabla completa y genera un registro para cada alumno y cada fecha que contenga un símbolo válido. Tu respuesta debe contener **solamente el bloque de código JSON** sin texto adicional.`;

    }, [settings.semesterStart, settings.semesterEnd]);


    const handleVerify = () => {
        setError('');
        if (!pastedText.trim()) {
            setError('El campo de texto está vacío.');
            return;
        }

        let data;
        try {
            data = JSON.parse(pastedText);
            if (!data.attendanceRecords || !Array.isArray(data.attendanceRecords)) {
                throw new Error("El JSON no contiene la clave 'attendanceRecords' o no es un array.");
            }
        } catch (e) {
            setError('Texto inválido. Asegúrate de pegar el JSON exacto. Error: ' + (e as Error).message);
            return;
        }

        const studentMap = new Map(group.students.map(s => [normalizeText(s.name), s]));
        const validStatuses = Object.values(AttendanceStatus);
        
        const records: ParsedRecord[] = data.attendanceRecords
            .filter((rec: any) => rec.studentName && rec.date && rec.status && validStatuses.includes(rec.status as AttendanceStatus))
            .map((rec: any) => {
                const normalizedName = normalizeText(rec.studentName);
                const matchedStudent = studentMap.get(normalizedName) || null;
                return {
                    originalName: rec.studentName,
                    date: rec.date,
                    status: rec.status,
                    matchedStudent
                };
            });

        if (records.length === 0) {
            setError(`No se encontraron registros válidos en el JSON proporcionado.`);
            return;
        }

        setParsedRecords(records);
        setStep(2);
    };
    
    const handleRecordChange = (index: number, studentId: string) => {
        const updatedRecords = [...parsedRecords];
        const student = group.students.find(s => s.id === studentId) || null;
        updatedRecords[index].matchedStudent = student;
        setParsedRecords(updatedRecords);
    };

    const handleImportClick = () => {
        const validRecordsCount = parsedRecords.filter(r => r.matchedStudent).length;
        if (validRecordsCount > 0) {
            setConfirmModalOpen(true);
        } else {
             dispatch({ type: 'ADD_TOAST', payload: { message: 'No hay registros válidos para importar.', type: 'error' } });
        }
    };
    
    const executeImport = () => {
        const validRecords = parsedRecords
            .filter(r => r.matchedStudent)
            .map(r => ({
                studentId: r.matchedStudent!.id,
                date: r.date,
                status: r.status,
            }));

         dispatch({
            type: 'BULK_SET_ATTENDANCE',
            payload: { groupId: group.id, records: validRecords }
        });
        dispatch({ type: 'ADD_TOAST', payload: { message: `${validRecords.length} registros importados.`, type: 'success' } });
        setConfirmModalOpen(false);
        handleClose();
    };

    const handleClose = () => {
        setPastedText('');
        setError('');
        setParsedRecords([]);
        setStep(1);
        onClose();
    };
    
    const renderStepOne = () => (
        <>
            <div>
                <h3 className="font-semibold mb-2 text-lg">Paso 1: Genera los datos con IA</h3>
                <p className="text-sm text-slate-500 mb-2">Copia el siguiente prompt, ve a Gemini (o tu IA preferida), sube la imagen de tu lista de asistencia y pega el prompt.</p>
                <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md text-xs whitespace-pre-wrap font-mono ring-1 ring-slate-200 dark:ring-slate-700">
                    {promptText}
                </pre>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => navigator.clipboard.writeText(promptText)}>
                    <Icon name="edit-3" className="w-4 h-4"/> Copiar Prompt
                </Button>
            </div>
            <div>
                <h3 className="font-semibold mb-2 text-lg">Paso 2: Pega el resultado JSON aquí</h3>
                <p className="text-sm text-slate-500 mb-2">Copia la respuesta JSON completa que te dio la IA y pégala en el siguiente cuadro de texto.</p>
                <textarea
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    rows={8}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    placeholder='Pega aquí el objeto JSON, ej: { "attendanceRecords": [...] }'
                    aria-label="Pegar resultado JSON"
                />
            </div>
            {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-sm rounded-md">
                    {error}
                </div>
            )}
        </>
    );
    
    const renderStepTwo = () => {
        const matchedCount = parsedRecords.filter(r => r.matchedStudent).length;
        const unmatchedCount = parsedRecords.length - matchedCount;

        return (
             <div>
                <h3 className="font-semibold mb-2 text-lg">Paso 3: Verifica los Datos</h3>
                <p className="text-sm text-slate-500 mb-4">
                    Revisa los registros extraídos. Asigna un alumno a los nombres no reconocidos. Los registros sin un alumno asignado serán ignorados.
                </p>
                <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md text-sm mb-4 flex justify-around">
                    <span><Icon name="check-circle-2" className="inline w-4 h-4 mr-1 text-green-500"/>{matchedCount} Coincidencias</span>
                    <span><Icon name="x-circle" className="inline w-4 h-4 mr-1 text-red-500"/>{unmatchedCount} Sin coincidencia</span>
                </div>
                <div className="max-h-[40vh] overflow-y-auto pr-2">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white dark:bg-slate-800">
                            <tr className="border-b dark:border-slate-600">
                                <th className="p-2 text-left">Nombre en Imagen</th>
                                <th className="p-2 text-left">Alumno Asignado</th>
                                <th className="p-2 text-center">Fecha</th>
                                <th className="p-2 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parsedRecords.map((record, index) => (
                                <tr key={index} className={`border-b dark:border-slate-700/50 ${!record.matchedStudent ? 'bg-red-50 dark:bg-red-900/30' : ''}`}>
                                    <td className="p-2">{record.originalName}</td>
                                    <td className="p-2">
                                        <select 
                                            value={record.matchedStudent?.id || ''} 
                                            onChange={e => handleRecordChange(index, e.target.value)}
                                            className="w-full p-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-xs"
                                        >
                                            <option value="" disabled>Seleccionar alumno...</option>
                                            {group.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2 text-center whitespace-nowrap">{record.date}</td>
                                    <td className="p-2 text-center">{record.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };
    
    const matchedCount = parsedRecords.filter(r => r.matchedStudent).length;
    const unmatchedCount = parsedRecords.length - matchedCount;

    return (
        <>
            <Modal isOpen={isOpen} onClose={handleClose} title="Importar Asistencia desde Texto" size="xl">
                <div className="space-y-4">
                    {step === 1 ? renderStepOne() : renderStepTwo()}
                </div>
                <div className="flex justify-between items-center mt-6">
                     {step === 2 && (
                        <Button variant="secondary" onClick={() => { setStep(1); setError(''); }}>
                            <Icon name="arrow-left" className="w-4 h-4" /> Volver
                        </Button>
                    )}
                     <div className={`flex gap-3 ${step === 2 ? '' : 'w-full justify-end'}`}>
                        <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                        {step === 1 ? (
                            <Button onClick={handleVerify} disabled={!pastedText}>
                                Verificar Datos <Icon name="arrow-right" className="w-4 h-4"/>
                            </Button>
                        ) : (
                             <Button onClick={handleImportClick} disabled={matchedCount === 0}>
                                <Icon name="upload-cloud" className="w-4 h-4"/> Confirmar e Importar
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={executeImport}
                title="Confirmar Importación"
                confirmText="Importar"
            >
                <p>
                    Se importarán <strong>{matchedCount}</strong> registros de asistencia.
                </p>
                <p>
                    <strong>{unmatchedCount}</strong> registros sin coincidencia serán ignorados.
                </p>
                <p className="mt-2">¿Deseas continuar?</p>
            </ConfirmationModal>
        </>
    );
};

export default AttendanceTextImporter;