import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const output = fileURLToPath(new URL('../lib/', import.meta.url))
await rm(output, { recursive: true, force: true })
