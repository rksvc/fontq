<script setup lang="ts">
import { CloudUploadOutline, SearchOutline, TrashOutline } from '@vicons/ionicons5'
import { type DataTableColumns, type DataTableRowKey, NButton, NButtonGroup, NConfigProvider, NDataTable, NDivider, NGlobalStyle, NIcon, NText, NUpload, NUploadDragger, type UploadFileInfo, darkTheme } from 'naive-ui'
import { h, ref } from 'vue'
import fonts from '../fonts.json'

const theme = ref(window.matchMedia('(prefers-color-scheme: dark)').matches ? darkTheme : null)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
  theme.value = event.matches ? darkTheme : null
})

type RowData = {
  key: string
  font: string
  size: string
  children?: RowData[]
}

const loading = ref(false)
const files = ref<UploadFileInfo[]>([])
const data = ref<RowData[]>([])
const expandedRowKeys = ref<DataTableRowKey[]>([])
const columns: DataTableColumns<RowData> = [
  {
    title: 'Required Font',
    key: 'font',
    render(row: RowData) {
      return row.children == null
        ? h('a', {
          target: '_blank',
          href: `https://pan.acgrip.com/超级字体整合包 XZ/完整包/${row.font}`,
          style: 'color: green',
          innerHTML: row.font
        })
        : row.font
    }
  },
  {
    title: 'File Size',
    key: 'size'
  }
]

async function queryFonts() {
  loading.value = true
  const styleToFont = new Map<string, string>()
  const usedStyles = new Set<string>()
  const usedFonts = new Set<string>()
  for (const file of files.value) {
    if (!file.file) continue
    const text = await file.file.text()
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
        for (const match of parts[9].matchAll(/\{.*\\fn(.+?)(?:\}|\\.*\})/g)) {
          const font = match[1].trim()
          usedFonts.add(font.startsWith('@') ? font.slice('@'.length) : font)
        }
      }
    }
  }
  for (const style of usedStyles) {
    const font = styleToFont.get(style)
    if (font)
      usedFonts.add(font)
  }

  data.value = [...usedFonts].toSorted().map(font => {
    const providers = ((fonts.name_to_idxes as Record<string, number[]>)[font] ?? [])
      .map(idx => fonts.fonts[idx])
    return {
      key: font,
      font,
      size: '',
      children: providers
        .toSorted((a, b) => a.size - b.size)
        .map(({ path, size }) => ({
          key: `${font}#${path}`,
          font: path,
          size: `${(size / 1024 / 1024).toFixed(2)}MB`
        }))
    }
  })
  expandedRowKeys.value = data.value.map(({ key }) => key)
  loading.value = false
}
</script>

<template>
  <n-config-provider :theme="theme">
    <div style="padding: 2em 10em; justify-items: center;">
      <n-upload accept=".ass" multiple :file-list="files" @change="({ fileList }) => files = fileList">
        <n-upload-dragger>
          <div style="margin-bottom: .5em">
            <n-icon size="48" :depth="3">
              <CloudUploadOutline />
            </n-icon>
          </div>
          <n-text>
            Drag and drop ASS files to here to upload.
          </n-text>
        </n-upload-dragger>
      </n-upload>

      <n-button-group style="margin-top: .7em; margin-bottom: 1em;">
        <n-button ghost @click="files = []">
          <template #icon>
            <n-icon>
              <TrashOutline />
            </n-icon>
          </template>
          Clear
        </n-button>
        <n-button ghost @click="queryFonts">
          <template #icon>
            <n-icon>
              <SearchOutline />
            </n-icon>
          </template>
          Query
        </n-button>
      </n-button-group>

      <n-divider />

      <n-data-table :columns="columns" :data="data" :row-key="(row: RowData) => row.key" :loading="loading" striped
        :expanded-row-keys="expandedRowKeys" @update:expanded-row-keys="rowKeys => expandedRowKeys = rowKeys" />
    </div>
    <n-global-style />
  </n-config-provider>
</template>
