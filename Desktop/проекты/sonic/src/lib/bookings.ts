export function validateBookingWindow(startsAt: string, endsAt: string | null): string | null {
  const startsAtDate = new Date(startsAt)
  const endsAtDate = endsAt ? new Date(endsAt) : null

  if (Number.isNaN(startsAtDate.getTime())) return 'Некорректное время начала'
  if (endsAtDate && Number.isNaN(endsAtDate.getTime())) return 'Некорректное время окончания'
  if (startsAtDate.getTime() < Date.now() - 5 * 60 * 1000) return 'Нельзя создать бронь в прошлом'
  if (endsAtDate && endsAtDate <= startsAtDate) return 'Время окончания должно быть позже начала'

  return null
}

export function isActiveBookingVisible(endsAt: string | null, nowIso: string): boolean {
  if (endsAt === null) return true
  return new Date(endsAt).getTime() >= new Date(nowIso).getTime()
}
