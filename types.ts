
// FIX: Define DayOfWeek here to break circular dependency with constants.ts
export type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';

export type { Layouts, Layout } from 'react-grid-layout';

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: 'class' | 'evaluation' | 'deadline' | 'custom' | 'gcal';
  color: string;
  groupId?: string;
}

export interface Student {
  id: string;
  name: string;
  matricula: string;
  nickname?: string;
  isRepeating?: boolean; // True if repeating the subject (Recursamiento)
  team?: string;        // Name or ID of the team they belong to
}

export interface EvaluationType {
  id: string;
  name: string;
  weight: number; // Percentage (e.g., 30 for 30%)
  isAttendance?: boolean; // If true, grade is calculated automatically from attendance
}

export interface Group {
  id: string;
  name: string;
  subject: string;
  subjectShortName?: string; // Short version of subject for UI elements (e.g., "MAT", "FÍS")
  quarter?: string; // New field for Cuatrimestre (e.g., "1º", "5º")
  classDays: DayOfWeek[];
  students: Student[];
  color: string; // e.g., 'indigo', 'green', etc.
  evaluationTypes: {
    partial1: EvaluationType[];
    partial2: EvaluationType[];
  };
}

export enum AttendanceStatus {
  Pending = 'Pendiente',
  Present = 'Presente',
  Absent = 'Ausente',
  Late = 'Retardo',
  Justified = 'Justificado',
  Exchange = 'Intercambio',
}

export interface Evaluation {
  id: string;
  name: string;
  maxScore: number;
  partial: 1 | 2;
  typeId: string; // Links to EvaluationType id
  isTeamBased?: boolean; // If true, grades are shared across team members
}

export type SidebarGroupDisplayMode = 'name' | 'name-abbrev' | 'abbrev';

export interface Settings {
  semesterStart: string;
  firstPartialEnd: string;
  semesterEnd: string;
  showMatricula: boolean;
  showTeamsInGrades: boolean;
  sidebarGroupDisplayMode: SidebarGroupDisplayMode; // Replaces boolean
  theme: 'classic' | 'dark';
  lowAttendanceThreshold: number;
  googleCalendarUrl: string;
  googleCalendarColor: string;
  professorName: string;
  apiUrl: string;
  apiKey: string;
  mobileUpdateUrl: string; // URL for version.json
}

export type ActiveView = 'dashboard' | 'groups' | 'attendance' | 'grades' | 'reports' | 'calendar';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface Archive {
    id: string;
    name: string;
    dateArchived: string;
    data: AppState;
}

export interface AppState {
  groups: Group[];
  attendance: {
    [groupId: string]: {
      [studentId: string]: {
        [date: string]: AttendanceStatus;
      };
    };
  };
  evaluations: {
    [groupId: string]: Evaluation[];
  };
  grades: {
    [groupId: string]: {
      [studentId: string]: {
        [evaluationId: string]: number | null;
      };
    };
  };
  calendarEvents: CalendarEvent[];
  gcalEvents: CalendarEvent[];
  settings: Settings;
  activeView: ActiveView;
  selectedGroupId: string | null;
  toasts: Toast[];
  archives: Archive[];
  teamNotes?: { [teamName: string]: string }; // NEW: Storage for private team annotations
}

export type AppAction =
  | { type: 'SET_INITIAL_STATE'; payload: Partial<AppState> }
  | { type: 'SET_VIEW'; payload: ActiveView }
  | { type: 'SET_SELECTED_GROUP'; payload: string | null }
  | { type: 'SAVE_GROUP'; payload: Group }
  | { type: 'DELETE_GROUP'; payload: string }
  | { type: 'SAVE_STUDENT'; payload: { groupId: string; student: Student } }
  | { type: 'BULK_ADD_STUDENTS'; payload: { groupId: string; students: Student[] } }
  | { type: 'DELETE_STUDENT'; payload: { groupId: string; studentId: string } }
  | { type: 'UPDATE_ATTENDANCE'; payload: { groupId: string; studentId: string; date: string; status: AttendanceStatus } }
  | { type: 'QUICK_ATTENDANCE'; payload: { groupId: string; date: string } }
  | { type: 'BULK_UPDATE_ATTENDANCE'; payload: { groupId: string; startDate: string; endDate: string; status: AttendanceStatus; overwrite: boolean } }
  | { type: 'BULK_SET_ATTENDANCE'; payload: { groupId: string; records: { studentId: string; date: string; status: AttendanceStatus }[] } }
  | { type: 'SAVE_EVALUATION'; payload: { groupId: string; evaluation: Evaluation } }
  | { type: 'DELETE_EVALUATION'; payload: { groupId: string; evaluationId: string } }
  | { type: 'UPDATE_GRADE'; payload: { groupId: string; studentId: string; evaluationId: string; score: number | null } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'ADD_TOAST'; payload: Omit<Toast, 'id'> }
  | { type: 'REMOVE_TOAST'; payload: number }
  | { type: 'SAVE_EVENT'; payload: CalendarEvent }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SET_GCAL_EVENTS'; payload: CalendarEvent[] }
  | { type: 'ARCHIVE_CURRENT_STATE'; payload: string } 
  | { type: 'RESTORE_ARCHIVE'; payload: string } 
  | { type: 'DELETE_ARCHIVE'; payload: string } 
  | { type: 'TRANSITION_SEMESTER'; payload: { newGroups: Group[]; newSettings: Partial<Settings> } }
  | { type: 'RENAME_TEAM'; payload: { oldName: string, newName: string } }
  | { type: 'DELETE_TEAM'; payload: string }
  | { type: 'UPDATE_TEAM_NOTE'; payload: { teamName: string, note: string } } // NEW ACTION
  | { type: 'ASSIGN_STUDENT_TEAM'; payload: { studentId: string, teamName: string | undefined } };

export interface Professor {
    name: string;
    birthdate: string;
}

export interface MotivationalQuote {
    text: string;
    author: string;
    icon?: string;
    image?: string;
}

export type StudentStatus = 'Destacado' | 'Regular' | 'En Riesgo';

export interface ReportMonthlyAttendance {
    [monthYear: string]: { 
        percentage: number;
        present: number;
        totalClasses: number;
    }
}

export interface ReportData {
  student: Student;
  status: StudentStatus;
  totalAttendancePercentage: number;
  totalGradeAverage: string | number;
  p1AttendancePercentage: number;
  p1GradeAverage: string | number;
  p2AttendancePercentage: number;
  p2GradeAverage: string | number;
  monthlyAttendance: ReportMonthlyAttendance;
  grades: { [evaluationId: string]: number | null };
}

export interface GroupMonthlyAttendance {
    [monthYear: string]: number; 
}

export interface GroupEvaluationAverages {
    [evaluationId: string]: {
        name: string;
        average: number;
        maxScore: number;
    };
}

export interface GroupReportSummary {
    monthlyAttendance: GroupMonthlyAttendance;
    evaluationAverages: GroupEvaluationAverages;
}

export interface MobileUpdateInfo {
    version: string;
    url: string;
    notes?: string;
}
