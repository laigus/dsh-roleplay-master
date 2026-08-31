import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isBuiltin } from 'node:module'
import { basename, dirname, resolve } from 'node:path'
import type { UserConfig } from 'tsdown'
import { transform } from 'lightningcss'

const PACKAGE_NAME = 'dsh-roleplay-master'
const CSS_PREFIX = '\0roleplay-css:'
const CSS_SUFFIX = '.mjs'

function cssSource(source: string, importer: string): string {
  const besideImporter = resolve(dirname(importer), source)
  if (existsSync(besideImporter)) return besideImporter
  const marker = `${resolve('lib/types')}`
  if (!besideImporter.startsWith(marker)) return besideImporter
  return resolve('src', besideImporter.slice(marker.length + 1))
}

const host: UserConfig = {
  name: PACKAGE_NAME,
  entry: ['lib/types/index.js', 'lib/types/invariant.js'],
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  clean: false,
  dts: false,
  deps: {
    neverBundle: specifier => specifier.startsWith('@deepseek-ai/') || isBuiltin(specifier),
    alwaysBundle: specifier => !specifier.startsWith('@deepseek-ai/') && !isBuiltin(specifier),
  },
}

const clientExternals = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
])

const client: UserConfig = {
  name: `${PACKAGE_NAME}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
  fixedExtension: false,
  clean: false,
  dts: false,
  sourcemap: false,
  minify: true,
  deps: {
    neverBundle: specifier => clientExternals.has(specifier),
    alwaysBundle: specifier => !clientExternals.has(specifier),
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  plugins: [{
    name: 'roleplay-css-modules',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.module.css') || importer === undefined) return null
      return CSS_PREFIX + cssSource(source, importer) + CSS_SUFFIX
    },
    async load(id: string) {
      if (!id.startsWith(CSS_PREFIX)) return null
      const file = id.slice(CSS_PREFIX.length, -CSS_SUFFIX.length)
      this.addWatchFile(file)
      const { code, exports } = transform({
        filename: file,
        code: await readFile(file),
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classes = Object.fromEntries(
        Object.entries(exports ?? {}).map(([local, value]) => [local, value.name]),
      )
      const tagId = `${PACKAGE_NAME}/${basename(file)}`
      return [
        `const css = ${JSON.stringify(code.toString())};`,
        `const tagId = ${JSON.stringify(tagId)};`,
        "if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {",
        "  const tag = document.createElement('style');",
        `  tag.dataset.plugin = ${JSON.stringify(PACKAGE_NAME)};`,
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = css;',
        '  document.head.appendChild(tag);',
        '}',
        `export default ${JSON.stringify(classes)};`,
      ].join('\n')
    },
  }],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_NAME)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default [host, client]
