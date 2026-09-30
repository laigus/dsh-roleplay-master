#!/usr/bin/env node

import { createRequire } from 'node:module'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PRESET_ID = 'my-master'
const PRESET_ORDER = 10
const MARKER_START = '# --- dsh-roleplay-master preset (auto-generated; do not edit) ---'
const MARKER_END = '# --- end dsh-roleplay-master preset ---'
const USAGE = 'Usage: dsh-roleplay-master-install [--preset-format auto|rows|dir]'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(packageRoot, 'presets', PRESET_ID)
const dshHome = resolve(process.env.DSH_HOME || join(homedir(), '.dsh'))
const presetRoot = join(dshHome, '.agent-presets')
const directoryTarget = join(presetRoot, PRESET_ID)

function requestedFormat() {
  const index = process.argv.indexOf('--preset-format')
  if (index < 0) return 'auto'
  const value = process.argv[index + 1]
  if (value !== 'auto' && value !== 'rows' && value !== 'dir') {
    process.stderr.write(`unknown --preset-format ${String(value)}\n${USAGE}\n`)
    process.exit(1)
  }
  return value
}

/** DSH 0.2 replaced directory presets with `@deepseek-ai/dsh-agent-preset` patch rows. */
function hostSupportsPresetRows(anchor) {
  try {
    createRequire(join(anchor, 'package.json')).resolve('@deepseek-ai/dsh-agent-preset/package.json')
    return true
  } catch {
    return false
  }
}

/** Read the one `key: value` pair a preset metadata file holds. */
function metadataField(text, key) {
  const match = new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(text)
  return match === null ? '' : match[1].trim()
}

/** Nest the preset's plugin rows under `config.plugins` for a 0.2 patch entry. */
function presetBlock(metadata, rows) {
  const plugins = rows
    .split('\n')
    .map(line => (line.trim() === '' ? '' : `          ${line}`))
    .join('\n')
    .replace(/\n+$/, '')
  return [
    MARKER_START,
    '- insert:',
    `    - id: preset-${PRESET_ID}`,
    "      name: '@deepseek-ai/dsh-agent-preset'",
    '      config:',
    `        id: ${PRESET_ID}`,
    `        name: ${metadata.name}`,
    `        description: ${metadata.description}`,
    `        order: ${PRESET_ORDER}`,
    '        plugins:',
    plugins,
    MARKER_END,
    '',
  ].join('\n')
}

/** Replace the managed block in `patchPath`, or append it; every other line is preserved. */
async function writePresetBlock(patchPath, block) {
  const existing = existsSync(patchPath) ? await readFile(patchPath, 'utf8') : ''
  const start = existing.indexOf(MARKER_START)
  const end = existing.indexOf(MARKER_END)
  let next
  if (start >= 0 && end > start) {
    next = existing.slice(0, start) + block + existing.slice(end + MARKER_END.length).replace(/^\n+/, '\n')
  } else {
    next = `${existing.replace(/\s*$/, '')}${existing.trim() === '' ? '' : '\n\n'}${block}`
  }
  await mkdir(dirname(patchPath), { recursive: true })
  await writeFile(patchPath, next, 'utf8')
}

async function installDirectoryPreset() {
  const targetFromRoot = relative(presetRoot, directoryTarget)
  if (targetFromRoot !== PRESET_ID || isAbsolute(targetFromRoot)) {
    throw new Error('resolved preset target is outside the user preset directory')
  }
  await mkdir(presetRoot, { recursive: true })
  await rm(directoryTarget, { recursive: true, force: true })
  await cp(source, directoryTarget, { recursive: true })
  process.stdout.write(`Installed user preset ${PRESET_ID} at ${directoryTarget}\n`)
}

// `dsh plugin --profile <name> exec …` runs with the profile directory as cwd, so a
// profile patch there is the install target; otherwise the home-level layer applies
// to every profile. DSH_HOME is shared between profiles, so the 0.1.x directory is
// left in place next to a 0.2 patch row.
const cwd = resolve(process.cwd())
const profilePatch = join(cwd, 'cordis.patch.yml')
const looksLikeProfile = existsSync(profilePatch) && existsSync(join(cwd, 'cordis.yml'))
const anchor = looksLikeProfile ? cwd : dshHome
const format = requestedFormat()
const useRows = format === 'rows' || (format === 'auto' && hostSupportsPresetRows(anchor))

if (!useRows) {
  await installDirectoryPreset()
  process.exit(0)
}

const presetMeta = await readFile(join(source, 'preset.yml'), 'utf8')
const patchPath = looksLikeProfile ? profilePatch : join(dshHome, 'cordis.patch.yml')
await writePresetBlock(patchPath, presetBlock(
  {
    name: metadataField(presetMeta, 'name'),
    description: metadataField(presetMeta, 'description'),
  },
  await readFile(join(source, 'agent.cordis.yml'), 'utf8'),
))

process.stdout.write(
  `DSH 0.2+ host: installed preset "${metadataField(presetMeta, 'name')}" (${PRESET_ID}) as a patch row in ${patchPath}\n`,
)
if (existsSync(directoryTarget)) {
  process.stdout.write(`Note: ${directoryTarget} is a 0.1.x-style preset and is inert on 0.2 hosts.\n`)
}
process.stdout.write('Restart DSH, then choose the preset when creating a session.\n')
