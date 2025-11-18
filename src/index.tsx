import { Check, CircleCheck, CircleQuestionMark, CircleX, Copy, Upload, X } from 'lucide-preact'
import fonts from '../fonts.json'
import './styles.css'
import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'

const context = document.createElement('canvas').getContext('2d')!

export function App() {
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
        class="box"
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
          onInput={evt => {
            const input = evt.target as HTMLInputElement
            if (!input.files) return
            const files: File[] = []
            for (let i = 0; i < input.files.length; i++) files.push(input.files[i])
            setAssFiles(files)
          }}
        />
        <label class="label" htmlFor="input" style={{ cursor: 'pointer' }}>
          <Upload />
          <div>Drag and drop ASS files to here to upload.</div>
        </label>
      </form>
      {requiredFonts?.length ? (
        requiredFonts.map(({ name, tooltip, providers, installed }) => (
          <div key={name}>
            <div style={{ marginTop: '.7em', marginBottom: '.3em' }}>
              {name}
              <span class="icon" style={{ marginLeft: '.2em', marginRight: '.2em' }}>
                {installed ? (
                  <span title="Installed">
                    <CircleCheck color="var(--icon-green)" />
                  </span>
                ) : (
                  <span title="Not installed">
                    <CircleX color="var(--icon-red)" />
                  </span>
                )}
              </span>
              <span title={tooltip} class="icon">
                <CircleQuestionMark color="var(--icon-blue)" />
              </span>
            </div>
            {!!providers.length && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div class="corner"></div>
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
                            class="icon copy"
                            title="Copy"
                            style={{ marginLeft: '.2em', cursor: 'pointer' }}
                            onClick={async () => {
                              await navigator.clipboard.writeText(name)
                              setCopied(name)
                            }}
                            onMouseLeave={() => setCopied('')}
                          >
                            {copied === name ? (
                              <Check color="var(--icon-green)" />
                            ) : (
                              <Copy color="var(--icon-blue)" />
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
        <div class="label box" style={{ border: '1px dashed var(--border-color)' }}>
          <X />
          <div>No Required Fonts</div>
        </div>
      )}
    </div>
  )
}

render(<App />, document.getElementById('root')!)
