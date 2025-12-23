export type CsvRow = Record<string, string>

const normalizeHeader = (value: string) =>
  value.toLowerCase().replace(/[\s_-]+/g, "")

const parseLine = (line: string) => {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

export const parseCsv = (text: string): CsvRow[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) return []

  const headers = parseLine(lines[0]).map(normalizeHeader)
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseLine(lines[i])
    if (values.every((value) => value === "")) continue

    const row: CsvRow = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? ""
    })
    rows.push(row)
  }

  return rows
}
