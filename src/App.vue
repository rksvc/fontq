<script setup lang="ts">
import { computedAsync } from '@vueuse/core'
import { ref } from 'vue'
import fonts from '../fonts.json'
import { CheckmarkCircleIcon, QuestionCircleIcon, ArrowUploadIcon, CancelIcon, CancelCircleIcon } from '@proicons/vue'

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
</script>

<template>
  <div id="container" style="justify-items: center;">
    <form id="upload" :ondrop="onDrop" :ondragover="(evt: DragEvent) => evt.preventDefault()">
      <input type="file" accept=".ass" multiple id="input" style="display: none;" @change="onInputChange" />
      <label id="label" for="input">
        <ArrowUploadIcon />
        <div>Drag and drop ASS files to here to upload.</div>
      </label>
    </form>
    <table>
      <thead>
        <tr>
          <th>Required Font</th>
          <th>File Size</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!requiredFonts?.length">
          <td id="no-data" colspan="2">
            <CancelIcon />
            <div>No Data</div>
          </td>
        </tr>
        <template v-else v-for="{ name, tooltip, providers, installed } of requiredFonts">
          <tr>
            <td class="name" colspan="2">
              {{ name }}
              <span class="icon" style="margin-right: .1em;">
                <span v-if="installed" title="Installed">
                  <CheckmarkCircleIcon color="#37b24d" />
                </span>
                <span v-else title="Not installed">
                  <CancelCircleIcon color="#f03e3e" />
                </span>
              </span>
              <span :title="tooltip" class="icon">
                <QuestionCircleIcon color="#1c7ed6" />
              </span>
            </td>
          </tr>
          <tr v-for="{ path, name, size } of providers">
            <td class="link">
              <a :href="`https://pan.acgrip.com/?dir=超级字体整合包 XZ/完整包/${path}`" target="_blank"
                referrerpolicy="no-referrer">
                {{ path }}</a>{{ name }}
            </td>
            <td class="size">{{ (size / 1024 / 1024).toFixed(2) }}MB</td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style>
/* modified from https://stackoverflow.com/a/51481693 */
@font-face {
  font-family: '__DEFAULT__';
  src: url('data:application/font-woff2;base64,d09GMgABAAAAAAK4AA0AAAAABwQAAAJlAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP0ZGVE0cGhgGYACCQhEICjBECwoAATYCJAMQBCAFhlEHKhsmBmCO0UvPmFPmhBNKmBAyImqN7NnbJ9LAQhI7wICQYZWKDBvNmj2BUGEZo+Iejt/P3aQND+na/M1Eqn+1SSJSSQsRScVTo2HUmeOhYAC/pVAMYvK+eg8lv0j6kbQiBQlYsLVSuVRswWoFrGkH3SWfA9AqBP79+Y0A/t5u/f9u2vEk6EY/UFBR0LiQZy20PGiJgQwO72++o8sDKFp4DJu7iFBWEWyPcAUgIIIxNjRoMMQGljkEQ5zGgKoKNk5Pny+ffmUD0koAKSiM5sJfbyz3yumpAipoR0E7OgEVBKTW7nQ562tXtuz6sQBBuHn9ZbS6zf9vd7XTKuLJRc8VoH2ZICIuIG+V+LwikQsAkEVp91Mo9PtgY9P4CVE9Q9HmIxoD/lDVtKLFQh7Rqubbik7rpcshtQNXgAHR7imKXq/RmPCBqt0RWtyIC63a8+bZOt3Pl7kzFYW2sUNB78Z4nCksOrSjkKg2ZGdeBIoKi0gjUIVIhKY4DJbJgKYoBorugLIHNpDl8SDv6LF9XIug8pK/4nLdVc6aRpvgVwPsGxlqgP2DYQPgLArDItrQQcVmPr4LZC1RdAaOQoYiiLAwDWk2tHM8QsJh2vciS3K6bJ4/Q1ExARkgOU3sv2Kq0VE2TAodioggEogwIiouKgUlxQVtcUzAoSgXb0yisYCERLl8om5uvyCCIUjsLyfReDSFyXhwy5m8l89jcQzRPJrQ0QYq3/HNUgqCLFFKMuYg/k+IpmsBhtpKvBzUp2BwdogGicE5tBy3efjQ8TtsFYwVJrSyh8bBfL6Wo+XbjadP3S7bUBFs0RQA');
}

:root {
  --border-radius: .5em;
  --border-color: #ced4da;
  --bg-color: #f8f9fa;
  --svg-color: #adb5bd;
  --primary-color: #845ef7;
  color: #495057;
  font-size: 14px;
}

svg {
  width: 2.8em;
  height: 2.8em;
  color: var(--svg-color);
}

a {
  color: var(--primary-color);
}

@media (orientation: landscape) {
  #container {
    padding: 2em 10em;
  }
}

@media (orientation: portrait) {
  #container {
    padding: 2em;
  }
}

#upload {
  margin-bottom: 3em;
  background-color: var(--bg-color);
  border: 1px dashed var(--border-color);
  border-radius: var(--border-radius);
  width: 25em;
  height: 9em;
  overflow: hidden;

  &:hover {
    border-color: var(--primary-color);
  }
}

#label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1em;
  height: 100%;
  cursor: pointer;
}

table {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
  border-spacing: 0;
}

#no-data {
  color: var(--svg-color);
  text-align: center;
  padding: 2em;
  border-top: 1px solid var(--border-color);
}

th {
  font-weight: normal;
  text-align: start;
  background-color: var(--bg-color);

  &:nth-child(1) {
    border-right: 1px solid var(--border-color);
  }
}

th,
td {
  padding: .8em;
}

.name {
  border-top: 1px solid var(--border-color);
}

.link,
.size {
  border-top: 1px dashed var(--border-color);
}

.link {
  padding-left: 3em;
  border-right: 1px dashed var(--border-color);
}

.icon {
  vertical-align: middle;

  svg {
    width: 1.1em;
    height: 1.1em;
  }
}
</style>
