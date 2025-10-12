import fs from 'fs'
import path from 'path'

/**
 * Convert una/ markdown into content/ using the Cursor style guide.
 * - Wipes content/ completely.
 * - Builds sections: overview, game-design, features, systems, stages.
 * - Prepends front matter with title/description (from first H1 and first paragraph),
 *   removing the in-body H1.
 * - Numbers files within sections. Creates .navigation.yml per section.
 */

const repoRoot = process.cwd()
const srcRoot = path.join(repoRoot, 'una')
const outRoot = path.join(repoRoot, 'content')

/** Utilities **/
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch {
    return ''
  }
}

function writeFile(p, content) {
  ensureDir(path.dirname(p))
  fs.writeFileSync(p, content, 'utf8')
}

function stripMarkdown(md) {
  // naive strip for description: remove code fences, headings, md links/images, emphasis
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#+\s+/gm, '')
    .replace(/\!\[[^\]]*\]\([^\)]*\)/g, '')
    .replace(/\[[^\]]*\]\([^\)]*\)/g, m => m.replace(/\[[^\]]*\]\([^\)]*\)/g, ''))
    .replace(/[`*_~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function toTitleFromFilename(name) {
  return name
    .replace(/\.md$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, m => m.toUpperCase())
}

function extractFrontMatterAndBody(raw) {
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3)
    if (end !== -1) {
      const fm = raw.slice(0, end + 4)
      const body = raw.slice(end + 4).replace(/^\s*/, '')
      return { frontMatter: fm, body }
    }
  }
  return { frontMatter: null, body: raw }
}

function parseTitleAndDescription(body, fallbackTitle) {
  const lines = body.split(/\r?\n/)
  let title = null
  let startIdx = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const h1 = line.match(/^#\s+(.+)/)
    if (h1) {
      title = h1[1].trim()
      startIdx = i + 1
      break
    }
  }
  // description: first non-empty paragraph after H1/front matter
  let desc = ''
  let buffer = []
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') {
      if (buffer.length > 0) break
      else continue
    }
    // skip headings and code fences as description source
    if (/^\s*```/.test(line) || /^\s*#/.test(line) || /^::/.test(line)) {
      if (buffer.length > 0) break
      continue
    }
    buffer.push(line)
  }
  if (buffer.length > 0) {
    desc = stripMarkdown(buffer.join(' '))
  }
  if (!desc) {
    // fallback: use first 160 chars of body without md
    desc = stripMarkdown(body).slice(0, 160)
  }
  if (!title) title = fallbackTitle
  return { title, description: desc }
}

function quote(str) {
  return JSON.stringify(String(str))
}

function buildFrontMatter(obj) {
  const yaml = [
    '---',
    `title: ${quote(obj.title)}`,
    `description: ${quote(obj.description)}`,
    '---',
    ''
  ].join('\n')
  return yaml
}

function removeFirstH1(body) {
  const lines = body.split(/\r?\n/)
  let removed = false
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!removed && /^#\s+/.test(line)) {
      removed = true
      continue
    }
    out.push(line)
  }
  return out.join('\n').replace(/^\n+/, '')
}

function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) files.push(...collectFiles(full))
    else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) files.push(full)
  }
  return files
}

function sortBasenamesWithIndexFirst(basenames) {
  const arr = [...basenames].sort((a, b) => a.localeCompare(b))
  arr.sort((a, b) => {
    const ai = /(^|-)index\.md$/i.test(a)
    const bi = /(^|-)index\.md$/i.test(b)
    if (ai && !bi) return -1
    if (!ai && bi) return 1
    return 0
  })
  return arr
}

function toNumberedName(basename, index) {
  const isIndex = /(^|-)index\.md$/i.test(basename)
  if (isIndex) return '1.index.md'
  return `${index + 1}.${basename}`
}

function writeNavigationYml(dir, title, icon = false) {
  writeFile(path.join(dir, '.navigation.yml'), `title: ${title}\nicon: ${icon}\n`)
}

/** Conversion **/
function wipeContent() {
  fs.rmSync(outRoot, { recursive: true, force: true })
  ensureDir(outRoot)
}

function convertSimpleSection(_sectionName, title, srcDir, outDirPrefixed) {
  const outDir = path.join(outRoot, outDirPrefixed)
  ensureDir(outDir)
  writeNavigationYml(outDir, title)

  const entries = fs.existsSync(srcDir) ? fs.readdirSync(srcDir) : []
  const mdFiles = entries.filter(f => f.toLowerCase().endsWith('.md'))
  const sorted = sortBasenamesWithIndexFirst(mdFiles)

  sorted.forEach((base, i) => {
    const numName = toNumberedName(base, i)
    const src = path.join(srcDir, base)
    const raw = readFileSafe(src)
    const { frontMatter, body } = extractFrontMatterAndBody(raw)
    const fallbackTitle = toTitleFromFilename(base)
    const { title: t, description } = parseTitleAndDescription(body, fallbackTitle)
    const newBody = removeFirstH1(body)
    const fm = frontMatter ? null : buildFrontMatter({ title: t, description })
    const outPath = path.join(outDir, numName)
    const content = `${fm ?? ''}${newBody}`.replace(/^\s+$/, '')
    writeFile(outPath, content)
  })
}

function convertSingleFile(srcFile, outDirPrefixed, outBasename) {
  const outDir = path.join(outRoot, outDirPrefixed)
  ensureDir(outDir)
  const raw = readFileSafe(srcFile)
  const { frontMatter, body } = extractFrontMatterAndBody(raw)
  const fallbackTitle = toTitleFromFilename(path.basename(srcFile))
  const { title, description } = parseTitleAndDescription(body, fallbackTitle)
  const newBody = removeFirstH1(body)
  const fm = frontMatter ? null : buildFrontMatter({ title, description })
  const outPath = path.join(outDir, outBasename)
  writeFile(outPath, `${fm ?? ''}${newBody}`)
}

function convertStages() {
  const stagesRoot = path.join(srcRoot, 'stages')
  const outDir = path.join(outRoot, '5.stages')
  ensureDir(outDir)
  writeNavigationYml(outDir, 'Stages')

  // root stages index
  const stagesIndex = path.join(stagesRoot, 'index.md')
  if (fs.existsSync(stagesIndex)) {
    convertSingleFile(stagesIndex, '5.stages', '1.index.md')
  }

  const stageFolders = ['1', '2', '3']
  stageFolders.forEach((sf, i) => {
    const src = path.join(stagesRoot, sf)
    if (!fs.existsSync(src)) return
    const title = `Stage ${sf}`
    const outSub = path.join('5.stages', `${i + 2}.stage-${sf}`)
    const outSubAbs = path.join(outRoot, outSub)
    ensureDir(outSubAbs)
    writeNavigationYml(outSubAbs, title)
    const files = fs.readdirSync(src).filter(f => f.toLowerCase().endsWith('.md'))
    const sorted = sortBasenamesWithIndexFirst(files)
    sorted.forEach((base, idx) => {
      const numName = toNumberedName(base, idx)
      const raw = readFileSafe(path.join(src, base))
      const { frontMatter, body } = extractFrontMatterAndBody(raw)
      const fallbackTitle = toTitleFromFilename(base)
      const { title: t, description } = parseTitleAndDescription(body, fallbackTitle)
      const newBody = removeFirstH1(body)
      const fm = frontMatter ? null : buildFrontMatter({ title: t, description })
      writeFile(path.join(outSubAbs, numName), `${fm ?? ''}${newBody}`)
    })
  })
}

function writeLanding() {
  const out = path.join(outRoot, 'index.md')
  const links = [
    { label: 'Overview', to: '/overview' },
    { label: 'Game Design', to: '/game-design' },
    { label: 'Features', to: '/features' },
    { label: 'Systems', to: '/systems' },
    { label: 'Stages', to: '/stages' }
  ]
  const fm = [
    '---',
    'seo:',
    '  title: Una Documentation',
    '  description: Migrated documentation for Una, organized for Nuxt Content.',
    '---',
    '',
    '## Una Documentation',
    '',
    'Explore the documentation by section:',
    '',
    ...links.map(l => `- [${l.label}](${l.to})`),
    ''
  ].join('\n')
  writeFile(out, fm)
}

function main() {
  if (!fs.existsSync(srcRoot)) {
    console.error('Missing una/ source directory')
    process.exit(1)
  }
  wipeContent()

  // Overview from una/core.md if present
  const coreFile = path.join(srcRoot, 'core.md')
  const hasCore = fs.existsSync(coreFile)
  if (hasCore) {
    const outDirPrefixed = '1.overview'
    ensureDir(path.join(outRoot, outDirPrefixed))
    writeNavigationYml(path.join(outRoot, outDirPrefixed), 'Overview')
    convertSingleFile(coreFile, outDirPrefixed, '1.core.md')
  }

  // Game Design
  convertSimpleSection('game-design', 'Game Design', path.join(srcRoot, 'game-design'), '2.game-design')

  // Features
  convertSimpleSection('features', 'Features', path.join(srcRoot, 'features'), '3.features')

  // Systems
  convertSimpleSection('systems', 'Systems', path.join(srcRoot, 'systems'), '4.systems')

  // Stages
  convertStages()

  // Landing
  writeLanding()

  console.log('Conversion complete.')
}

main()
