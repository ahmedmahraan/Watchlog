/** Today's date as YYYY-MM-DD in the user's local time zone. */
export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 136 -> "2h 16m", 45 -> "45m". */
export function formatRuntime(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}
