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

  it('installs a 0.2 preset row into the profile patch and preserves other entries', async () => {
    const dshHome = await mkdtemp(join(tmpdir(), 'dsh-roleplay-master-'))
    const profile = join(dshHome, 'profiles', 'desktop')
    const patch = join(profile, 'cordis.patch.yml')

    try {
      await mkdir(profile, { recursive: true })
      await writeFile(join(profile, 'package.json'), '{"name":"dsh-profile-desktop","private":true}\n')
      await writeFile(join(profile, 'cordis.yml'), '[]\n')
      await writeFile(patch, '# keep me\n- id: ui-theme\n  disabled: false\n')

      const result = spawnSync(process.execPath, [installer, '--preset-format', 'rows'], {
        encoding: 'utf8',
        cwd: profile,
        env: { ...process.env, DSH_HOME: dshHome },
      })

      expect(result.status, result.stderr).toBe(0)
      expect(result.stdout).toContain('0.2+ host')

      const written = await readFile(patch, 'utf8')
      expect(written).toContain('# keep me')
      expect(written).toContain('- id: ui-theme')
      expect(written).toContain("name: '@deepseek-ai/dsh-agent-preset'")
      expect(written).toContain('        id: my-master')
      expect(written).toContain('        name: 我的主人')
      expect(written).toContain("            name: 'dsh-roleplay-master'")

      const again = spawnSync(process.execPath, [installer, '--preset-format', 'rows'], {
        encoding: 'utf8',
        cwd: profile,
        env: { ...process.env, DSH_HOME: dshHome },
      })
      expect(again.status, again.stderr).toBe(0)
      const rewritten = await readFile(patch, 'utf8')
      expect(rewritten.match(/preset-my-master/g)?.length).toBe(1)
    } finally {
      await rm(dshHome, { recursive: true, force: true })
    }
  })
})
