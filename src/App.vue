<script setup lang="ts">
import { CloseOutline, CloudUploadOutline, HelpCircleOutline } from '@vicons/ionicons5'
import { computedAsync } from '@vueuse/core'
import { ref } from 'vue'
import fonts from '../fonts.json'

const assFiles = ref<File[]>([])

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

  return [...usedFonts]
    .toSorted(([a,], [b,]) => a.localeCompare(b))
    .map(([name, [reverseDeps, overrideTag]]) => {
      let tooltip = `Required by ${[...reverseDeps].join(', ')}`
      if (overrideTag) {
        if (reverseDeps.size)
          tooltip += ' and '
        tooltip += 'override tags'
      }
      return {
        name,
        tooltip,
        providers: ((fonts.name_to_idxes as Record<string, number[]>)[name.toLowerCase()] ?? [])
          .map(idx => fonts.fonts[idx])
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
        <CloudUploadOutline />
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
            <CloseOutline />
            <div>No Data</div>
          </td>
        </tr>
        <template v-else v-for="{ name, tooltip, providers } of requiredFonts">
          <tr>
            <td class="name" colspan="2">
              {{ name }}
              <span :title="tooltip" style="vertical-align: middle;">
                <HelpCircleOutline style="width: 1.2em; color: #1c7ed6;" />
              </span>
            </td>
          </tr>
          <tr v-for="{ path, size } of providers">
            <td class="link"><a :href="`https://pan.acgrip.com/超级字体整合包 XZ/完整包/${path}`" target="_blank">{{ path }}</a>
            </td>
            <td class="size">{{ (size / 1024 / 1024).toFixed(2) }}MB</td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style>
:root {
  --border-radius: .5em;
  --border-color: #ced4da;
  --bg-color: #f8f9fa;
  --svg-color: #adb5bd;
  --primary-color: #845ef7;
  color: #343a40;
  font-size: 14px;
}

svg {
  width: 3.5em;
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
</style>
