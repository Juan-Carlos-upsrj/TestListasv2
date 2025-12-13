import { v4 as uuidv4 } from 'uuid';
import { CalendarEvent } from '../types';

interface VEvent {
    summary?: string;
    dtstart?: string;
    dtend?: string;
    rrule?: string;
}

/**
 * A lenient, custom parser for iCal data from Google Calendar.
 * It's designed to be resilient to formatting errors by only parsing what's needed
 * (SUMMARY, DTSTART, DTEND, RRULE) and ignoring other lines. This avoids crashes caused
 * by strict parsers on slightly malformed feeds.
 * 
 * @param {string} icsData The raw iCal data string.
 * @param {string} colorClasses The Tailwind CSS classes to apply to the events.
 * @returns {CalendarEvent[]} An array of parsed calendar events.
 */
const customIcsParser = (icsData: string, colorClasses: string): CalendarEvent[] => {
    // Unfold multi-line properties and normalize line endings.
    const unfoldedData = icsData.replace(/\r\n\s/g, '').replace(/\n\s/g, '');
    const lines = unfoldedData.split(/\r\n|\n/);

    const events: CalendarEvent[] = [];
    let currentVEvent: VEvent | null = null;

    for (const line of lines) {
        if (line.startsWith('BEGIN:VEVENT')) {
            currentVEvent = {};
            continue;
        }

        if (!currentVEvent) {
            continue;
        }

        if (line.startsWith('END:VEVENT')) {
            const processedEvents = processVEvent(currentVEvent, colorClasses);
            events.push(...processedEvents);
            currentVEvent = null;
            continue;
        }

        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':');

        if (key.startsWith('SUMMARY')) {
            currentVEvent.summary = value;
        } else if (key.startsWith('DTSTART')) {
            currentVEvent.dtstart = value;
        } else if (key.startsWith('DTEND')) {
            currentVEvent.dtend = value;
        } else if (key.startsWith('RRULE')) {
            currentVEvent.rrule = value;
        }
    }

    return events;
};


/**
 * Processes a single VEvent object, expanding multi-day and recurring events.
 * @param {VEvent} vevent The VEvent to process.
 * @param {string} colorClasses The Tailwind CSS classes to apply to the events.
 * @returns {CalendarEvent[]} An array of calendar events, expanded if necessary.
 */
const processVEvent = (vevent: VEvent, colorClasses: string): CalendarEvent[] => {
    if (!vevent.summary || !vevent.dtstart) {
        return [];
    }

    const title = vevent.summary;
    const events: CalendarEvent[] = [];

    const parseIcsDate = (dateStr: string): Date | null => {
        const match = dateStr.match(/(\d{4})(\d{2})(\d{2})/);
        if (!match) return null;
        const [, year, month, day] = match.map(Number);
        return new Date(year, month - 1, day);
    };
    
    const formatDate = (date: Date): string => date.toISOString().split('T')[0];

    const startDate = parseIcsDate(vevent.dtstart);
    if (!startDate) return [];

    const endDate = vevent.dtend ? parseIcsDate(vevent.dtend) : null;
    
    // Handle multi-day, non-recurring event first
    if (endDate && endDate > startDate && !vevent.rrule) {
        let currentDate = new Date(startDate);
        const eventUuid = uuidv4();
        // The end date in iCal for all-day events is exclusive, so we loop while less than.
        while (currentDate < endDate) {
             events.push({
                id: `gcal-${eventUuid}-${formatDate(currentDate)}`,
                date: formatDate(currentDate),
                title: title,
                type: 'gcal',
                color: colorClasses,
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return events;
    }

    // Handle simple weekly recurrence rule.
    if (vevent.rrule) {
        const rruleParts = vevent.rrule.split(';').reduce((acc, part) => {
            const [key, val] = part.split('=');
            if (key) acc[key] = val;
            return acc;
        }, {} as Record<string, string>);
        
        if (rruleParts.FREQ === 'WEEKLY' && rruleParts.BYDAY) {
            const dayMap: { [key: string]: number } = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
            const rruleDays = rruleParts.BYDAY.split(',').map(d => dayMap[d as keyof typeof dayMap]).filter(d => d !== undefined);
            
            const now = new Date();
            const windowStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            const windowEnd = new Date(now.getFullYear(), now.getMonth() + 6, 0);

            let currentDate = startDate > windowStart ? new Date(startDate) : new Date(windowStart);
            let i = 0;
            const MAX_EVENTS = 500; 

            while (currentDate <= windowEnd && i < MAX_EVENTS) {
                if (currentDate >= startDate && rruleDays.includes(currentDate.getDay())) {
                    events.push({
                        id: `gcal-${uuidv4()}-${formatDate(currentDate)}`,
                        date: formatDate(currentDate),
                        title: title,
                        type: 'gcal',
                        color: colorClasses,
                    });
                    i++;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return events;
        }
    }

    // Fallback for single-day events or unhandled RRULEs
    events.push({
        id: `gcal-${uuidv4()}`,
        date: formatDate(startDate),
        title: title,
        type: 'gcal',
        color: colorClasses,
    });
    return events;
};


export const fetchGoogleCalendarEvents = async (url: string, colorClasses: string): Promise<CalendarEvent[]> => {
    if (!url || !url.startsWith('http')) return [];
    
    // Using a CORS proxy to fetch the iCal file.
    const proxyUrl = 'https://corsproxy.io/?';
    const fetchUrl = `${proxyUrl}${encodeURIComponent(url)}`;

    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const icsData = await response.text();
        return customIcsParser(icsData, colorClasses);
    } catch (error) {
        console.error('Error fetching or parsing iCal data:', error);
        throw new Error('Could not fetch calendar data. Please check the URL and its permissions.');
    }
};