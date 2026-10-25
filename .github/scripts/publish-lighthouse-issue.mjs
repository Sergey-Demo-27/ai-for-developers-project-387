#!/usr/bin/env node
// Создаёт issue по самой серьёзной находке Lighthouse.
//
// Тело issue собирается детерминированно из сводки и, если агент успел
// написать report/analysis.md, дополняется его разбором. Повторный запуск
// с той же находкой не создаёт дубль: в теле есть скрытый маркер audit id.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const dryRun = process.env.DRY_RUN === '1'
const appUrl = process.env.APP_URL ?? ''
const runUrl = process.env.RUN_URL ?? ''
const label = 'lighthouse-audit'

if (!existsSync('report/findings.json')) {
  console.error('report/findings.json не найден: сначала запустите lighthouse-summary.mjs')
  process.exit(1)
}

const data = JSON.parse(readFileSync('report/findings.json', 'utf8'))
const summary = existsSync('report/summary.md')
  ? readFileSync('report/summary.md', 'utf8').trim()
  : ''
const analysis = existsSync('report/analysis.md')
  ? readFileSync('report/analysis.md', 'utf8').trim()
  : ''

const top = data.findings?.[0]
const marker = top
  ? `<!-- lighthouse-audit:${top.id} -->`
  : '<!-- lighthouse-audit:no-findings -->'
const title = top
  ? `[audit] ${top.title ?? top.id}`.slice(0, 120)
  : '[audit] Lighthouse: отчёт без замечаний'

const parts = [
  marker,
  '',
  '## Плановый аудит Lighthouse',
  '',
  `- **URL:** ${appUrl || data.url || '—'}`,
]

if (runUrl) {
  parts.push(`- **Прогон:** [Actions](${runUrl})`)
}

parts.push(
  '- **Артефакт:** `lighthouse-report` (JSON, HTML, сводка)',
  '',
  '## Сводка',
  '',
  summary || 'Сводка недоступна.',
  '',
  '## Разбор агента',
  '',
  analysis || 'Агент не смог подготовить разбор; см. полный отчёт в артефакте.',
  '',
  '---',
  '',
  '_Issue создан автоматически плановым аудитом._',
)

const body = `${parts.join('\n')}\n`
mkdirSync('report', { recursive: true })
writeFileSync('report/issue.md', body)

if (dryRun) {
  process.stdout.write(body)
  process.exit(0)
}

const gh = (args) =>
  execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()

try {
  gh([
    'label',
    'create',
    label,
    '--force',
    '--color',
    'FBCA04',
    '--description',
    'Находки планового аудита Lighthouse',
  ])
} catch (error) {
  console.warn(`Не удалось создать/обновить метку ${label}: ${error.stderr || error.message}`)
}

const existing = JSON.parse(
  gh(['issue', 'list', '--label', label, '--state', 'open', '--json', 'number,body', '--limit', '100']) ||
    '[]',
)

const duplicate = existing.find((issue) => (issue.body ?? '').includes(marker))
if (duplicate) {
  gh(['issue', 'edit', String(duplicate.number), '--body-file', 'report/issue.md'])
  console.log(`Находка уже отслеживается: issue #${duplicate.number} обновлён`)
  writeFileSync('report/created-issues.md', `Обновлён: #${duplicate.number}\n`)
  process.exit(0)
}

const created = gh([
  'issue',
  'create',
  '--title',
  title,
  '--body-file',
  'report/issue.md',
  '--label',
  label,
])

writeFileSync('report/created-issues.md', `${created}\n`)
console.log(`Создан issue: ${created}`)
