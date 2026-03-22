export const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' }
];

export function getDefaultBusinessHours() {
  return {
    workingDays: ['1', '2', '3', '4', '5', '6'],
    openingTime: '08:00',
    closingTime: '19:00',
    lunchStartTime: '12:00',
    lunchEndTime: '13:00',
    slotIntervalMinutes: 30
  };
}

export function normalizeBusinessHours(value = {}) {
  const defaults = getDefaultBusinessHours();

  return {
    workingDays: Array.isArray(value.workingDays) && value.workingDays.length > 0
      ? value.workingDays.map((item) => String(item))
      : defaults.workingDays,
    openingTime: String(value.openingTime || defaults.openingTime),
    closingTime: String(value.closingTime || defaults.closingTime),
    lunchStartTime: String(value.lunchStartTime || defaults.lunchStartTime),
    lunchEndTime: String(value.lunchEndTime || defaults.lunchEndTime),
    slotIntervalMinutes: Number(value.slotIntervalMinutes || defaults.slotIntervalMinutes)
  };
}

export function timeStringToMinutes(timeString) {
  const [hours, minutes] = String(timeString || '00:00').split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTimeString(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getWeekdayFromDateInput(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return String(date.getDay());
}

export function isWorkingDay(dateString, businessHours) {
  const normalized = normalizeBusinessHours(businessHours);
  const weekday = getWeekdayFromDateInput(dateString);
  return normalized.workingDays.includes(weekday);
}

export function isWithinLunchBreak(timeString, businessHours) {
  const normalized = normalizeBusinessHours(businessHours);

  if (!normalized.lunchStartTime || !normalized.lunchEndTime) {
    return false;
  }

  const current = timeStringToMinutes(timeString);
  const lunchStart = timeStringToMinutes(normalized.lunchStartTime);
  const lunchEnd = timeStringToMinutes(normalized.lunchEndTime);

  return current >= lunchStart && current < lunchEnd;
}

export function isWithinBusinessHours(timeString, durationMinutes, businessHours) {
  const normalized = normalizeBusinessHours(businessHours);

  const start = timeStringToMinutes(timeString);
  const end = start + Number(durationMinutes || 0);

  const opening = timeStringToMinutes(normalized.openingTime);
  const closing = timeStringToMinutes(normalized.closingTime);

  if (start < opening || end > closing) {
    return false;
  }

  if (normalized.lunchStartTime && normalized.lunchEndTime) {
    const lunchStart = timeStringToMinutes(normalized.lunchStartTime);
    const lunchEnd = timeStringToMinutes(normalized.lunchEndTime);

    const overlapsLunch = start < lunchEnd && end > lunchStart;

    if (overlapsLunch) {
      return false;
    }
  }

  return true;
}

export function generateBusinessTimeSlots(dateString, businessHours) {
  const normalized = normalizeBusinessHours(businessHours);

  if (!dateString || !isWorkingDay(dateString, normalized)) {
    return [];
  }

  const slots = [];
  const opening = timeStringToMinutes(normalized.openingTime);
  const closing = timeStringToMinutes(normalized.closingTime);
  const interval = Number(normalized.slotIntervalMinutes || 30);

  for (let current = opening; current < closing; current += interval) {
    const timeString = minutesToTimeString(current);

    if (isWithinLunchBreak(timeString, normalized)) {
      continue;
    }

    slots.push(timeString);
  }

  return slots;
}