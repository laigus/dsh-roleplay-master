#!/usr/bin/env node

import { cp, mkdir, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PRESET_ID = 'my-master'
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(packageRoot, 'presets', PRESET_ID)
const dshHome = resolve(process.env.DSH_HOME || join(homedir(), '.dsh'))
const presetRoot = join(dshHome, '.agent-presets')
const target = join(presetRoot, PRESET_ID)
const targetFromRoot = relative(presetRoot, target)

if (targetFromRoot !== PRESET_ID || isAbsolute(targetFromRoot)) {
  throw new Error('resolved preset target is outside the user preset directory')
}

await mkdir(presetRoot, { recursive: true })
await rm(target, { recursive: true, force: true })
await cp(source, target, { recursive: true })

process.stdout.write(`Installed user preset ${PRESET_ID} at ${target}\n`)
