import {
  ArrowUploadIcon,
  CancelCircleIcon,
  CancelIcon,
  CheckmarkCircleIcon,
  CheckmarkIcon,
  CopyIcon,
  QuestionCircleIcon,
} from '@proicons/react'
import { useEffect, useState } from 'react'
import fonts from '../fonts.json'

const context = document.createElement('canvas').getContext('2d')!

export default function App() {
  const [assFiles, setAssFiles] = useState<File[]>([])
  const [copied, setCopied] = useState('')
  const [requiredFonts, setRequiredFonts] = useState<
    {
      name: string
      tooltip: string
      installed: boolean
      providers: {
        size: number
        name: string
        path: string
      }[]
    }[]
  >([])

  useEffect(() => {
    ;(async () => {
      const usedFonts = new Map<string, [Set<string>, boolean]>()
      for (const file of assFiles) {
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
              if (font.startsWith('@')) font = font.slice('@'.length)
              if (font) {
                const reverseDeps = usedFonts.get(font)
                if (reverseDeps) reverseDeps[1] = true
                else usedFonts.set(font, [new Set(), true])
              }
            }
          }
        }
        for (const style of usedStyles) {
          const font = styleToFont.get(style)
          if (font) {
            const reverseDeps = usedFonts.get(font)
            if (reverseDeps) reverseDeps[0].add(style)
            else usedFonts.set(font, [new Set([style]), false])
          }
        }
      }

      context.font = '16px __DEFAULT__'
      const text = 'A'
      const baseline = context.measureText(text).width
      setRequiredFonts(
        [...usedFonts]
          .toSorted(([a], [b]) => a.localeCompare(b))
          .map(([name, [reverseDeps, overrideTag]]) => {
            let tooltip = `Required by ${[...reverseDeps].join(', ')}`
            if (overrideTag) {
              if (reverseDeps.size) tooltip += ' and '
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
                .toSorted((a, b) => a.size - b.size),
            }
          }),
      )
    })()
  }, [assFiles])

  return (
    <div style={{ padding: '2em', placeSelf: 'center' }}>
      <form
        id="upload"
        className="box"
        onDrop={evt => {
          evt.preventDefault()
          if (!evt.dataTransfer) return
          const files: File[] = []
          for (let i = 0; i < evt.dataTransfer.items.length; i++) {
            const item = evt.dataTransfer.items[i]
            if (item.kind === 'file') {
              const file = item.getAsFile()
              if (file?.name.endsWith('.ass')) files.push(file)
            }
          }
          setAssFiles(files)
        }}
        onDragOver={evt => evt.preventDefault()}
      >
        <input
          type="file"
          id="input"
          accept=".ass"
          multiple
          style={{ display: 'none' }}
          onChange={evt => {
            const input = evt.target as HTMLInputElement
            if (!input.files) return
            const files: File[] = []
            for (let i = 0; i < input.files.length; i++) files.push(input.files[i])
            setAssFiles(files)
          }}
        />
        <label className="label" htmlFor="input" style={{ cursor: 'pointer' }}>
          <ArrowUploadIcon />
          <div>Drag and drop ASS files to here to upload.</div>
        </label>
      </form>
      {requiredFonts?.length ? (
        requiredFonts.map(({ name, tooltip, providers, installed }) => (
          <div key={name}>
            <div style={{ marginTop: '.7em', marginBottom: '.3em' }}>
              {name}
              <span className="icon" style={{ marginLeft: '.2em', marginRight: '.1em' }}>
                {installed ? (
                  <span title="Installed">
                    <CheckmarkCircleIcon color="var(--icon-green)" />
                  </span>
                ) : (
                  <span title="Not installed">
                    <CancelCircleIcon color="var(--icon-red)" />
                  </span>
                )}
              </span>
              <span title={tooltip} className="icon">
                <QuestionCircleIcon color="var(--icon-blue)" />
              </span>
            </div>
            {!!providers.length && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div className="corner"></div>
                <table>
                  <tbody>
                    {providers.map(({ path, name, size }) => (
                      <tr key={`${path}/${name}`}>
                        <td>
                          <a
                            href={`https://pan.acgrip.com/?dir=超级字体整合包 XZ/完整包/${path}`}
                            target="_blank"
                          >
                            {path}
                          </a>
                          <span>{name}</span>
                          <span
                            className="icon copy"
                            title="Copy"
                            style={{ marginLeft: '.15em', cursor: 'pointer' }}
                            onClick={async () => {
                              await navigator.clipboard.writeText(name)
                              setCopied(name)
                            }}
                            onMouseLeave={() => setCopied('')}
                          >
                            {copied === name ? (
                              <CheckmarkIcon color="var(--icon-green)" />
                            ) : (
                              <CopyIcon color="var(--icon-blue)" />
                            )}
                          </span>
                        </td>
                        <td>{(size / 1024 / 1024).toFixed(2)}MB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="label box" style={{ border: '1px dashed var(--border-color)' }}>
          <CancelIcon />
          <div>No Required Fonts</div>
        </div>
      )}
    </div>
  )
}
