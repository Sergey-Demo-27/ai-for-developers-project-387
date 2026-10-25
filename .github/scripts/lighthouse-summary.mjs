#!/usr/bin/env node
// Разбирает JSON-отчёт Lighthouse, печатает Markdown-сводку и сохраняет
// машинночитаемый список находок для агента и публикатора issue.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const reportPath = process.argv[2] ?? 'report/lighthouse.report.json'
const report = JSON.parse(readFileSync(reportPath, 'utf8'))

const categoryOrder = ['performance', 'accessibility', 'best-practices', 'seo']
const categoryTitles = {
  performance: 'Производительность',
  accessibility: 'Доступность',
  'best-practices': 'Best practices',
  seo: 'SEO',
}

const categories = categoryOrder
  .filter((id) => report.categories?.[id])
  .map((id) => ({
    id,
    title: categoryTitles[id] ?? report.categories[id].title ?? id,
    score: report.categories[id].score,
  }))

// notApplicable/informative/manual — не проблемы, а справка. error означает,
// что аудит не удалось выполнить; его нельзя выдавать за находку.
const ignoredDisplayModes = new Set(['notApplicable', 'informative', 'manual', 'error'])

const findings = Object.values(report.audits ?? {})
  .filter(
    (audit) =>
      audit &&
      audit.id &&
      typeof audit.score === 'number' &&
      audit.score < 1 &&
      !ignoredDisplayModes.has(audit.scoreDisplayMode),
  )
  .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id))
  .map((audit) => ({
    id: audit.id,
    title: audit.title ?? audit.id,
    score: audit.score,
    scoreDisplayMode: audit.scoreDisplayMode,
    displayValue: audit.displayValue ?? '',
    description: audit.description ?? '',
  }))

const payload = {
  url: report.finalDisplayedUrl ?? report.finalUrl ?? '',
  fetchTime: report.fetchTime ?? '',
  categories,
  findings,
}

mkdirSync('report', { recursive: true })
writeFileSync('report/findings.json', `${JSON.stringify(payload, null, 2)}\n`)

const percent = (score) => (typeof score === 'number' ? `${Math.round(score * 100)}` : '—')

const lines = [
  `# Lighthouse: ${payload.url || 'отчёт'}`,
  '',
  `Дата: ${payload.fetchTime || '—'}`,
  '',
  '| Категория | Оценка |',
  '|---|---|',
]

for (const category of categories) {
  lines.push(`| ${category.title} | ${percent(category.score)} |`)
}

lines.push('', '## Находки', '')

if (findings.length === 0) {
  lines.push('Замечаний с оценкой ниже 100 не найдено.')
} else {
  for (const [index, finding] of findings.slice(0, 10).entries()) {
    const extra = finding.displayValue ? ` — ${finding.displayValue}` : ''
    lines.push(
      `${index + 1}. **${finding.title}** (\`${finding.id}\`) — ${percent(finding.score)}/100${extra}`,
    )
  }
  if (findings.length > 10) {
    lines.push('', `…и ещё ${findings.length - 10} находок в JSON-отчёте.`)
  }
}

lines.push('', 'Полный отчёт: артефакт `lighthouse-report`.')
process.stdout.write(`${lines.join('\n')}\n`)
