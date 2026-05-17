export function generateICS({
  title,
  start,
  durationMinutes,
  description,
  location,
}: {
  title: string
  start: Date
  durationMinutes: number
  description: string
  location: string
}) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
  }
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@flax.app`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Flax Admissions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
