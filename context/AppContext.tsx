
import React, { createContext, useReducer, useEffect, ReactNode, Dispatch, useState } from 'react';
import { AppState, AppAction, AttendanceStatus, Group, Evaluation, Archive } from '../types';
import { GROUP_COLORS } from '../constants';
import { getState, saveState } from '../services/dbService';
import { fetchGoogleCalendarEvents } from '../services/calendarService';
import { getClassDates } from '../services/dateUtils';
import { v4 as uuidv4 } from 'uuid';

const today = new Date();
const nextMonth = new Date();
nextMonth.setMonth(today.getMonth() + 1);
const fourMonthsLater = new Date();
fourMonthsLater.setMonth(today.getMonth() + 4);

const defaultState: AppState = {
  groups: [],
  attendance: {},
  evaluations: {},
  grades: {},
  calendarEvents: [],
  gcalEvents: [],
  settings: {
    semesterStart: today.toISOString().split('T')[0],
    firstPartialEnd: nextMonth.toISOString().split('T')[0],
    semesterEnd: fourMonthsLater.toISOString().split('T')[0],
    showMatricula: true,
    theme: 'classic', 
    lowAttendanceThreshold: 80,
    googleCalendarUrl: '',
    googleCalendarColor: 'blue',
    professorName: 'Nombre del Profesor',
    apiUrl: '',
    apiKey: '',
    mobileUpdateUrl: 'https://github.com/Juan-Carlos-upsrj/TestListas', 
  },
  activeView: 'dashboard',
  selectedGroupId: null,
  toasts: [],
  archives: [],
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_INITIAL_STATE': {
        const loadedState = action.payload || {};
        const loadedGroups: Group[] = (Array.isArray(loadedState.groups) ? loadedState.groups : []).filter(g => g && g.id);
        const migratedGroups = loadedGroups.map((group, index) => {
            const hasEvalTypes = group.evaluationTypes && group.evaluationTypes.partial1 && group.evaluationTypes.partial2;
            return {
                ...group,
                classDays: group.classDays || [],
                color: group.color || GROUP_COLORS[index % GROUP_COLORS.length].name,
                quarter: group.quarter || '', 
                evaluationTypes: hasEvalTypes ? group.evaluationTypes : {
                    partial1: [{ id: uuidv4(), name: 'General', weight: 100 }],
                    partial2: [{ id: uuidv4(), name: 'General', weight: 100 }]
                }
            };
        });
        
        const loadedEvaluations = (typeof loadedState.evaluations === 'object' && loadedState.evaluations !== null) ? loadedState.evaluations : {};
        const migratedEvaluations: AppState['evaluations'] = {};
        Object.keys(loadedEvaluations).forEach(groupId => {
            const group = migratedGroups.find(g => g.id === groupId);
            if (!group) return;
            const evaluationsForGroup = (Array.isArray(loadedEvaluations[groupId]) ? loadedEvaluations[groupId] : []).filter(Boolean);
            migratedEvaluations[groupId] = evaluationsForGroup.map((ev: Evaluation) => ({
                ...ev,
                partial: ev.partial || 1,
                typeId: ev.typeId || (ev.partial === 2 ? group.evaluationTypes.partial2[0]?.id : group.evaluationTypes.partial1[0]?.id)
            }));
        });

        const loadedSettings = loadedState.settings;
        const migratedSettings = { ...defaultState.settings, ...loadedSettings };
        if ((migratedSettings.theme as any) === 'iaev' || (migratedSettings.theme as any) === 'custom') {
            migratedSettings.theme = 'classic';
        }
        if (!migratedSettings.mobileUpdateUrl) {
            migratedSettings.mobileUpdateUrl = defaultState.settings.mobileUpdateUrl;
        }

        return {
            groups: migratedGroups,
            attendance: loadedState.attendance ?? defaultState.attendance,
            evaluations: migratedEvaluations,
            grades: loadedState.grades ?? defaultState.grades,
            calendarEvents: Array.isArray(loadedState.calendarEvents) ? loadedState.calendarEvents.filter(Boolean) : defaultState.calendarEvents,
            gcalEvents: Array.isArray(loadedState.gcalEvents) ? loadedState.gcalEvents.filter(Boolean) : defaultState.gcalEvents,
            settings: migratedSettings,
            activeView: 'dashboard',
            selectedGroupId: loadedState.selectedGroupId ?? null,
            toasts: [],
            archives: Array.isArray(loadedState.archives) ? loadedState.archives : [],
        };
    }
    case 'SET_VIEW':
      return { ...state, activeView: action.payload };
    case 'SET_SELECTED_GROUP':
      return { ...state, selectedGroupId: action.payload };
    case 'SAVE_GROUP': {
      const existingGroup = state.groups.find(g => g.id === action.payload.id);
      if (existingGroup) {
        return {
          ...state,
          groups: state.groups.map(g => g.id === action.payload.id ? action.payload : g),
        };
      }
      return { 
        ...state, 
        groups: [...state.groups, { ...action.payload, color: action.payload.color || GROUP_COLORS[state.groups.length % GROUP_COLORS.length].name }] 
      };
    }
    case 'DELETE_GROUP': {
        const newGroups = state.groups.filter(g => g.id !== action.payload);
        const newAttendance = {...state.attendance}; delete newAttendance[action.payload];
        const newEvaluations = {...state.evaluations}; delete newEvaluations[action.payload];
        const newGrades = {...state.grades}; delete newGrades[action.payload];
        return {
            ...state,
            groups: newGroups,
            attendance: newAttendance,
            evaluations: newEvaluations,
            grades: newGrades,
            selectedGroupId: state.selectedGroupId === action.payload ? null : state.selectedGroupId,
        };
    }
    case 'SAVE_STUDENT': {
      const { groupId, student } = action.payload;
      return {
        ...state,
        groups: state.groups.map(g => {
          if (g.id === groupId) {
            const studentExists = g.students.some(s => s.id === student.id);
            if (studentExists) return { ...g, students: g.students.map(s => s.id === student.id ? student : s) };
            return { ...g, students: [...g.students, student] };
          }
          return g;
        }),
      };
    }
    case 'BULK_ADD_STUDENTS': {
        const { groupId, students } = action.payload;
        return {
            ...state,
            groups: state.groups.map(g => (g.id === groupId ? { ...g, students: [...g.students, ...students] } : g)),
        };
    }
    case 'DELETE_STUDENT': {
        const { groupId, studentId } = action.payload;
        const newGrades = {...state.grades};
        if(newGrades[groupId]) delete newGrades[groupId][studentId];
        return {
            ...state,
            grades: newGrades,
            groups: state.groups.map(g => (g.id === groupId ? { ...g, students: g.students.filter(s => s.id !== studentId) } : g)),
        };
    }
    case 'UPDATE_ATTENDANCE': {
        const { groupId, studentId, date, status } = action.payload;
        const groupAttendance = state.attendance[groupId] || {};
        const studentAttendance = groupAttendance[studentId] || {};
        return {
            ...state,
            attendance: { ...state.attendance, [groupId]: { ...groupAttendance, [studentId]: { ...studentAttendance, [date]: status } } },
        };
    }
    case 'QUICK_ATTENDANCE': {
        const { groupId, date } = action.payload;
        const group = state.groups.find(g => g.id === groupId);
        if (!group) return state;
        const updatedAttendance = { ...state.attendance[groupId] };
        group.students.forEach(student => {
            const currentStatus = updatedAttendance[student.id]?.[date];
            if (!currentStatus || currentStatus === AttendanceStatus.Pending) {
                if (!updatedAttendance[student.id]) updatedAttendance[student.id] = {};
                updatedAttendance[student.id][date] = AttendanceStatus.Present;
            }
        });
        return { ...state, attendance: { ...state.attendance, [groupId]: updatedAttendance } };
    }
    case 'BULK_UPDATE_ATTENDANCE': {
        const { groupId, startDate, endDate, status, overwrite } = action.payload;
        const group = state.groups.find(g => g.id === groupId);
        if (!group) return state;
        const datesToUpdate = getClassDates(startDate, endDate, group.classDays);
        const newAttendance = JSON.parse(JSON.stringify(state.attendance));
        if (!newAttendance[groupId]) newAttendance[groupId] = {};
        group.students.forEach(student => {
            if (!newAttendance[groupId][student.id]) newAttendance[groupId][student.id] = {};
            datesToUpdate.forEach(date => {
                const currentStatus = newAttendance[groupId][student.id][date];
                if (overwrite || !currentStatus || currentStatus === AttendanceStatus.Pending) newAttendance[groupId][student.id][date] = status;
            });
        });
        return { ...state, attendance: newAttendance };
    }
    case 'BULK_SET_ATTENDANCE': {
        const { groupId, records } = action.payload;
        const updatedAttendance = { ...state.attendance };
        const updatedGroupAttendance = { ...(updatedAttendance[groupId] || {}) };
        records.forEach(record => {
            const updatedStudentAttendance = { ...(updatedGroupAttendance[record.studentId] || {}) };
            updatedStudentAttendance[record.date] = record.status;
            updatedGroupAttendance[record.studentId] = updatedStudentAttendance;
        });
        updatedAttendance[groupId] = updatedGroupAttendance;
        return { ...state, attendance: updatedAttendance };
    }
    case 'SAVE_EVALUATION': {
        const { groupId, evaluation } = action.payload;
        const groupEvaluations = state.evaluations[groupId] || [];
        const evalExists = groupEvaluations.some(e => e.id === evaluation.id);
        return {
            ...state,
            evaluations: {
                ...state.evaluations,
                [groupId]: evalExists ? groupEvaluations.map(e => e.id === evaluation.id ? evaluation : e) : [...groupEvaluations, evaluation],
            },
        };
    }
    case 'DELETE_EVALUATION': {
        const { groupId, evaluationId } = action.payload;
        const newGrades = {...state.grades};
        if(newGrades[groupId]) Object.keys(newGrades[groupId]).forEach(sid => { delete newGrades[groupId][sid][evaluationId]; });
        return {
            ...state,
            grades: newGrades,
            evaluations: { ...state.evaluations, [groupId]: (state.evaluations[groupId] || []).filter(e => e.id !== evaluationId) },
        };
    }
    case 'UPDATE_GRADE': {
        const { groupId, studentId, evaluationId, score } = action.payload;
        const group = state.groups.find(g => g.id === groupId);
        const groupEvaluations = state.evaluations[groupId] || [];
        const evaluation = groupEvaluations.find(e => e.id === evaluationId);
        
        const updatedGrades = { ...state.grades };
        const updatedGroupGrades = { ...(updatedGrades[groupId] || {}) };

        // 1. Base update for the specific student
        const studentGrades = { ...(updatedGroupGrades[studentId] || {}) };
        studentGrades[evaluationId] = score;
        updatedGroupGrades[studentId] = studentGrades;

        // 2. Team Logic: If evaluation is team-based and student has a team
        if (evaluation?.isTeamBased && group) {
            const currentStudent = group.students.find(s => s.id === studentId);
            const teamName = currentStudent?.team;
            
            if (teamName) {
                // Find all group students in the same team
                group.students.forEach(s => {
                    if (s.team === teamName && s.id !== studentId) {
                        const otherStudentGrades = { ...(updatedGroupGrades[s.id] || {}) };
                        otherStudentGrades[evaluationId] = score;
                        updatedGroupGrades[s.id] = otherStudentGrades;
                    }
                });
            }
        }

        updatedGrades[groupId] = updatedGroupGrades;
        return { ...state, grades: updatedGrades };
    }
    case 'UPDATE_SETTINGS': {
        return { ...state, settings: { ...state.settings, ...action.payload } };
    }
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, { ...action.payload, id: Date.now() }] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    case 'SAVE_EVENT': {
        const eventExists = state.calendarEvents.some(e => e.id === action.payload.id);
        return { ...state, calendarEvents: eventExists ? state.calendarEvents.map(e => e.id === action.payload.id ? action.payload : e) : [...state.calendarEvents, action.payload] };
    }
    case 'DELETE_EVENT':
        return { ...state, calendarEvents: state.calendarEvents.filter(e => e.id !== action.payload) };
    case 'SET_GCAL_EVENTS':
        return { ...state, gcalEvents: action.payload };
    case 'ARCHIVE_CURRENT_STATE': {
        const newArchive: Archive = {
            id: uuidv4(),
            name: action.payload,
            dateArchived: new Date().toISOString(),
            data: JSON.parse(JSON.stringify(state))
        };
        return { ...state, archives: [...state.archives, newArchive] };
    }
    case 'RESTORE_ARCHIVE': {
        const archive = state.archives.find(a => a.id === action.payload);
        if (!archive) return state;
        return { ...archive.data, archives: state.archives, toasts: [] };
    }
    case 'DELETE_ARCHIVE':
        return { ...state, archives: state.archives.filter(a => a.id !== action.payload) };
    case 'TRANSITION_SEMESTER': {
        const { newGroups, newSettings } = action.payload;
        return {
            ...state,
            groups: newGroups,
            settings: { ...state.settings, ...newSettings },
            attendance: {}, grades: {}, evaluations: {},
            calendarEvents: state.calendarEvents.filter(e => e.type !== 'class' && e.type !== 'evaluation'),
            selectedGroupId: null,
        };
    }
    default:
      return state;
  }
};

export const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<AppAction>;
}>({
  state: defaultState,
  dispatch: () => null,
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, defaultState);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await getState();
        if (savedState) dispatch({ type: 'SET_INITIAL_STATE', payload: savedState });
      } catch (error) {
        console.error("Failed to load state from DB:", error);
      } finally {
        setIsInitialized(true);
      }
    };
    loadState();
  }, []);
  
  useEffect(() => {
    if (!isInitialized) return;
    const timeoutId = setTimeout(() => { saveState(state); }, 1000);
    return () => clearTimeout(timeoutId);
  }, [state, isInitialized]);
  
  useEffect(() => {
    if (isInitialized && state.settings.googleCalendarUrl) {
      const gcalColor = GROUP_COLORS.find(c => c.name === state.settings.googleCalendarColor)?.calendar || GROUP_COLORS[0].calendar;
      fetchGoogleCalendarEvents(state.settings.googleCalendarUrl, gcalColor)
        .then(events => { dispatch({ type: 'SET_GCAL_EVENTS', payload: events }); })
        .catch(error => {
            console.error("Failed to fetch GCal events:", error);
            dispatch({ type: 'ADD_TOAST', payload: { message: error.message, type: 'error' } });
            dispatch({ type: 'SET_GCAL_EVENTS', payload: [] });
        });
    } else if (isInitialized) {
        dispatch({ type: 'SET_GCAL_EVENTS', payload: [] });
    }
  }, [isInitialized, state.settings.googleCalendarUrl, state.settings.googleCalendarColor]);

  if (!isInitialized) return null; 

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};
