import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
const installer = join(repositoryRoot, 'scripts', 'install-preset.mjs')

describe('preset installer', () => {
  it('replaces the named user preset under DSH_HOME', async () => {
    const dshHome = await mkdtemp(join(tmpdir(), 'dsh-roleplay-master-'))
    const target = join(dshHome, '.agent-presets', 'my-master')

    try {
      await mkdir(target, { recursive: true })
      await writeFile(join(target, 'stale.yml'), 'stale\n')

      const result = spawnSync(process.execPath, [installer], {
        encoding: 'utf8',
        env: { ...process.env, DSH_HOME: dshHome },
      })

      expect(result.status, result.stderr).toBe(0)
      expect(result.stdout).toContain('Installed user preset my-master')
      await expect(readFile(join(target, 'stale.yml'), 'utf8')).rejects.toThrow()
      await expect(readFile(join(target, 'preset.yml'), 'utf8')).resolves
        .toContain('name: 我的主人')
      await expect(readFile(join(target, 'agent.cordis.yml'), 'utf8')).resolves
        .toContain("name: 'dsh-roleplay-master'")
    } finally {
      await rm(dshHome, { recursive: true, force: true })
    }
  })
})
