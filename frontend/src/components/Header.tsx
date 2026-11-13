import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { useCallback, useRef, useState, type FormEvent } from 'react'
import { normalizeUrl } from '../lib/api'
import { useDismiss } from '../lib/useDismiss'

/** The DrastDB mark: a "D" sliced into rows. Source: assets/logo/drastdb-mark-*.svg */
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.69 3.75H11.62A8.25 8.25 0 0 1 17.99 6.75H4.69A0.56 0.56 0 0 1 4.12 6.19V4.31A0.56 0.56 0 0 1 4.69 3.75Z" />
      <path d="M4.69 8.25H7.88V11.25H4.69A0.56 0.56 0 0 1 4.12 10.69V8.81A0.56 0.56 0 0 1 4.69 8.25Z" />
      <path d="M14.11 8.25H18.97A8.25 8.25 0 0 1 19.84 11.25H16.06A4.5 4.5 0 0 0 14.11 8.25Z" />
      <path d="M4.69 12.75H7.88V15.75H4.69A0.56 0.56 0 0 1 4.12 15.19V13.31A0.56 0.56 0 0 1 4.69 12.75Z" />
      <path d="M16.06 12.75H19.84A8.25 8.25 0 0 1 18.97 15.75H14.11A4.5 4.5 0 0 0 16.06 12.75Z" />
      <path d="M4.69 17.25H17.99A8.25 8.25 0 0 1 11.62 20.25H4.69A0.56 0.56 0 0 1 4.12 19.69V17.81A0.56 0.56 0 0 1 4.69 17.25Z" />
    </svg>
  )
}

type Props = {
  baseUrl: string
  online: boolean | null
  onChangeUrl: (url: string) => void
  onReconnect: () => void
}

function hostOf(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function ConnectionMenu({ baseUrl, online, onChangeUrl, onReconnect }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(baseUrl)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  const state = online === null ? 'is-wait' : online ? 'is-ok' : 'is-err'
  const label = online === null ? 'Connecting' : online ? 'Connected' : 'Offline'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next = normalizeUrl(draft)
    if (!/^https?:\/\/.+/.test(next)) return
    if (next === baseUrl) onReconnect()
    else onChangeUrl(next)
    setOpen(false)
  }

  return (
    <div className="menu-anchor" ref={ref}>
      <button
        type="button"
        className="conn-pill"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setDraft(baseUrl)
          setOpen((o) => !o)
        }}
      >
        <span className={`status-dot ${state}`} />
        <span className="conn-label">{label}</span>
        <span className="conn-host num">{hostOf(baseUrl)}</span>
        <ChevronDown size={14} className="conn-chevron" />
      </button>

      {open && (
        <div className="menu menu-right conn-menu" role="dialog" aria-label="Server connection">
          <form onSubmit={submit} className="conn-form">
            <label className="field">
              <span className="field-label">DrastDB server URL</span>
              <input
                className="input mono"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                autoFocus
              />
            </label>
            <button type="submit" className="btn btn-primary btn-sm">
              {normalizeUrl(draft) === baseUrl ? 'Reconnect' : 'Save and connect'}
            </button>
          </form>
          <p className="conn-help">
            {online
              ? 'The server is answering. Tables persist in its dbfiles/ folder.'
              : 'Start the server with cargo run in the drast folder, or with Docker on port 3495.'}
          </p>
        </div>
      )}
    </div>
  )
}

export function Header(props: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <Logo />
        <span className="brand-name">DrastDB</span>
        <svg className="crumb-sep" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M10.5 2.5 5.5 13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span className="brand-sub">Playground</span>
      </div>
      <div className="topbar-right">
        <ConnectionMenu {...props} />
        <a
          className="btn btn-ghost btn-sm topbar-docs"
          href="https://github.com/nios-x/drast/tree/master/docs"
          target="_blank"
          rel="noreferrer"
        >
          Docs
          <ArrowUpRight size={14} />
        </a>
      </div>
    </header>
  )
}
