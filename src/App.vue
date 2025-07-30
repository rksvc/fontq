<script setup lang="ts">
import { computedAsync } from '@vueuse/core'
import { ref } from 'vue'
import fonts from '../fonts.json'
import { CheckmarkCircleIcon, QuestionCircleIcon, ArrowUploadIcon, CancelCircleIcon, CopyIcon, CheckmarkIcon } from '@proicons/vue'

const assFiles = ref<File[]>([])
const context = document.createElement('canvas').getContext('2d')!

const requiredFonts = computedAsync(async () => {
  const usedFonts = new Map<string, [Set<string>, boolean]>()
  for (const file of assFiles.value) {
    const styleToFont = new Map<string, string>()
    const usedStyles = new Set<string>()
    const text = await file.text()
    for (const line of text.split('\n')) {
      if (line.startsWith('Style:')) {
        const parts = line.slice('Style:'.length).split(',', 2)
        if (parts.length !== 2) {
          console.log(`invalid ASS line: ${line}`)
          continue
        }
        const font = parts[1].trim()
        styleToFont.set(parts[0].trim(), font.startsWith('@') ? font.slice('@'.length) : font)
      } else if (line.startsWith('Dialogue:')) {
        const arr = line.slice('Dialogue:'.length).split(',')
        const parts = [...arr.splice(0, 9), arr.join(',')]
        if (parts.length !== 10) {
          console.log(`invalid ASS line: ${line}`)
          continue
        }
        usedStyles.add(parts[3].trim())
        for (const match of parts[9].matchAll(/\{.*?\\fn(.*?)(?=\\|\})/g)) {
          let font = match[1].trim()
          if (font.startsWith('@'))
            font = font.slice('@'.length)
          if (font) {
            const reverseDeps = usedFonts.get(font)
            if (reverseDeps)
              reverseDeps[1] = true
            else
              usedFonts.set(font, [new Set(), true])
          }
        }
      }
    }
    for (const style of usedStyles) {
      const font = styleToFont.get(style)
      if (font) {
        const reverseDeps = usedFonts.get(font)
        if (reverseDeps)
          reverseDeps[0].add(style)
        else
          usedFonts.set(font, [new Set([style]), false])
      }
    }
  }

  context.font = '16px __DEFAULT__'
  const text = 'A'
  const baseline = context.measureText(text).width
  return [...usedFonts]
    .toSorted(([a,], [b,]) => a.localeCompare(b))
    .map(([name, [reverseDeps, overrideTag]]) => {
      let tooltip = `Required by ${[...reverseDeps].join(', ')}`
      if (overrideTag) {
        if (reverseDeps.size)
          tooltip += ' and '
        tooltip += 'override tags'
      }
      context.font = `16px '${name}', __DEFAULT__`
      return {
        name,
        tooltip,
        installed: context.measureText(text).width !== baseline,
        providers: ((fonts.name_to_idxes as Record<string, number[]>)[name.toLowerCase()] ?? [])
          .map(idx => {
            const { path, size } = fonts.fonts[idx]
            const i = path.lastIndexOf('/') + 1
            return {
              size,
              name: path.slice(i),
              path: path.slice(0, i),
            }
          })
          .toSorted((a, b) => a.size - b.size)
      }
    })
})

function onDrop(evt: DragEvent) {
  evt.preventDefault();
  if (!evt.dataTransfer) return
  const files: File[] = []
  for (let i = 0; i < evt.dataTransfer.items.length; i++) {
    const item = evt.dataTransfer.items[i];
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file?.name.endsWith('.ass'))
        files.push(file)
    }
  }
  assFiles.value = files
}

function onInputChange(evt: Event) {
  const input = evt.target as HTMLInputElement
  if (!input.files) return
  const files: File[] = []
  for (let i = 0; i < input.files.length; i++)
    files.push(input.files[i])
  assFiles.value = files
}

const copied = ref('')
async function copy(name: string) {
  await navigator.clipboard.writeText(name)
  copied.value = name
}
</script>

<template>
  <div style="padding: 2em; place-self: center;">
    <form id="upload" :ondrop="onDrop" :ondragover="(evt: DragEvent) => evt.preventDefault()">
      <input type="file" accept=".ass" multiple id="input" style="display: none;" @change="onInputChange" />
      <label id="label" for="input">
        <ArrowUploadIcon />
        <div>Drag and drop ASS files to here to upload.</div>
      </label>
    </form>
    <template v-for="{ name, tooltip, providers, installed } of requiredFonts">
      <div style="margin-top: .7em; margin-bottom: .3em">
        {{ name }}
        <span class="icon" style="margin-right: .1em;">
          <span v-if="installed" title="Installed">
            <CheckmarkCircleIcon color="var(--icon-green)" />
          </span>
          <span v-else title="Not installed">
            <CancelCircleIcon color="var(--icon-red)" />
          </span>
        </span>
        <span :title="tooltip" class="icon">
          <QuestionCircleIcon color="var(--icon-blue)" />
        </span>
      </div>
      <div v-if="providers.length" style="display: flex; align-items: flex-start;">
        <div class="corner"></div>
        <table>
          <tbody>
            <tr v-for="{ path, name, size } of providers">
              <td>
                <a :href="`https://pan.acgrip.com/?dir=超级字体整合包 XZ/完整包/${path}`" target="_blank">
                  {{ path }}</a><span>{{ name }}</span>
                <span class="icon copy" title="Copy" style="margin-left: .15em; cursor: pointer;" @click="copy(name)"
                  @mouseleave="copied = ''">
                  <CheckmarkIcon v-if="copied === name" color="var(--icon-green)" />
                  <CopyIcon v-else color="var(--icon-blue)" />
                </span>
              </td>
              <td>{{ (size / 1024 / 1024).toFixed(2) }}MB</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style>
/* modified from https://stackoverflow.com/a/51481693 */
@font-face {
  font-family: '__DEFAULT__';
  src: url('data:application/font-woff2;base64,d09GMgABAAAAAAK4AA0AAAAABwQAAAJlAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP0ZGVE0cGhgGYACCQhEICjBECwoAATYCJAMQBCAFhlEHKhsmBmCO0UvPmFPmhBNKmBAyImqN7NnbJ9LAQhI7wICQYZWKDBvNmj2BUGEZo+Iejt/P3aQND+na/M1Eqn+1SSJSSQsRScVTo2HUmeOhYAC/pVAMYvK+eg8lv0j6kbQiBQlYsLVSuVRswWoFrGkH3SWfA9AqBP79+Y0A/t5u/f9u2vEk6EY/UFBR0LiQZy20PGiJgQwO72++o8sDKFp4DJu7iFBWEWyPcAUgIIIxNjRoMMQGljkEQ5zGgKoKNk5Pny+ffmUD0koAKSiM5sJfbyz3yumpAipoR0E7OgEVBKTW7nQ562tXtuz6sQBBuHn9ZbS6zf9vd7XTKuLJRc8VoH2ZICIuIG+V+LwikQsAkEVp91Mo9PtgY9P4CVE9Q9HmIxoD/lDVtKLFQh7Rqubbik7rpcshtQNXgAHR7imKXq/RmPCBqt0RWtyIC63a8+bZOt3Pl7kzFYW2sUNB78Z4nCksOrSjkKg2ZGdeBIoKi0gjUIVIhKY4DJbJgKYoBorugLIHNpDl8SDv6LF9XIug8pK/4nLdVc6aRpvgVwPsGxlqgP2DYQPgLArDItrQQcVmPr4LZC1RdAaOQoYiiLAwDWk2tHM8QsJh2vciS3K6bJ4/Q1ExARkgOU3sv2Kq0VE2TAodioggEogwIiouKgUlxQVtcUzAoSgXb0yisYCERLl8om5uvyCCIUjsLyfReDSFyXhwy5m8l89jcQzRPJrQ0QYq3/HNUgqCLFFKMuYg/k+IpmsBhtpKvBzUp2BwdogGicE5tBy3efjQ8TtsFYwVJrSyh8bBfL6Wo+XbjadP3S7bUBFs0RQA');
}

:root {
  color-scheme: light dark;
  --icon-red: light-dark(#f03e3e, #ff6b6b);
  --icon-green: light-dark(#37b24d, #51cf66);
  --icon-blue: light-dark(#1c7ed6, #339af0);
  --border-radius: .5em;
  --border-color: light-dark(#ced4da, #868e96);
  --primary-color: light-dark(#845ef7, #b197fc);
  color: light-dark(#495057, #dee2e6);
  background-color: light-dark(white, #212529);
  font-size: 14px;
}

*::selection {
  background-color: light-dark(#d0bfff, #9775fa);
}

#upload {
  width: fit-content;
  place-self: center;
  margin-bottom: 3em;
  background-color: light-dark(#f8f9fa, #343a40);
  border: 1px dashed var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;

  &:hover {
    border-color: var(--primary-color);
  }

  svg {
    width: 2.8em;
    height: 2.8em;
    color: light-dark(#adb5bd, #868e96);
  }
}

#label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1em;
  padding: 1.7em 2em;
  cursor: pointer;
}

.corner {
  width: 1.5em;
  height: 1.5em;
  margin-left: 1em;
  border-left: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  border-bottom-left-radius: .8em;
}

table {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
  border-spacing: 0;
}

td {
  padding: .6em;
}

tr:not(:first-child) td {
  border-top: 1px solid var(--border-color);
}

td:not(:last-child) {
  border-right: 1px solid var(--border-color);
}

a {
  color: var(--primary-color);
}

.icon {
  vertical-align: middle;

  svg {
    width: 1.1em;
    height: 1.1em;
  }
}

span:has(+ .copy:hover) {
  text-decoration: underline;
}
</style>
