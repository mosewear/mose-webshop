'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Archive,
  ArchiveRestore,
  Image as ImageIcon,
  Plus,
  X,
  Save,
} from 'lucide-react'

interface SceneRow {
  id: string
  label: string
  description: string | null
  scene_type: 'lifestyle' | 'studio' | 'editorial' | 'flatlay' | 'street'
  reference_image_url: string
  bg_removed_url: string | null
  focal_x: number
  focal_y: number
  palette_hex: string[]
  prompt_hint: string | null
  usage_count: number
  is_active: boolean
  created_at: string
}

const SCENE_TYPES: SceneRow['scene_type'][] = ['lifestyle', 'studio', 'editorial', 'flatlay', 'street']
const HEX_RE = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i

export default function ScenesPage() {
  const [scenes, setScenes] = useState<SceneRow[]>([])
  const [includeArchived, setIncludeArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Upload form state
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [sceneType, setSceneType] = useState<SceneRow['scene_type']>('lifestyle')
  const [focalX, setFocalX] = useState(0.5)
  const [focalY, setFocalY] = useState(0.5)
  const [promptHint, setPromptHint] = useState('')
  const [paletteHex, setPaletteHex] = useState<string[]>([])
  const [paletteDraft, setPaletteDraft] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(
        `/api/admin/ai-campaigns/scenes${includeArchived ? '?include_archived=1' : ''}`,
        { cache: 'no-store' },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Laden mislukt')
      setScenes(data.scenes || [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [includeArchived])

  useEffect(() => {
    load()
  }, [load])

  const resetForm = () => {
    setLabel('')
    setDescription('')
    setSceneType('lifestyle')
    setFocalX(0.5)
    setFocalY(0.5)
    setPromptHint('')
    setPaletteHex([])
    setPaletteDraft('')
    setFile(null)
    if (filePreview) URL.revokeObjectURL(filePreview)
    setFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = (incoming: File | null) => {
    if (filePreview) URL.revokeObjectURL(filePreview)
    setFile(incoming)
    setFilePreview(incoming ? URL.createObjectURL(incoming) : null)
  }

  const upload = async () => {
    if (!file) return setError('Kies eerst een afbeelding.')
    if (!label.trim()) return setError('Label is verplicht.')
    try {
      setUploading(true)
      setError(null)
      setMessage(null)
      const form = new FormData()
      form.append('file', file)
      form.append('label', label.trim())
      form.append('description', description.trim())
      form.append('scene_type', sceneType)
      form.append('focal_x', String(focalX))
      form.append('focal_y', String(focalY))
      form.append('prompt_hint', promptHint.trim())
      form.append('palette_hex', JSON.stringify(paletteHex))
      const res = await fetch('/api/admin/ai-campaigns/scenes', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload mislukt')
      setMessage('Scene toegevoegd.')
      resetForm()
      load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const toggleActive = async (scene: SceneRow) => {
    try {
      const res = await fetch('/api/admin/ai-campaigns/scenes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: scene.id, is_active: !scene.is_active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update mislukt')
      load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const remove = async (scene: SceneRow) => {
    if (!confirm(`Scene "${scene.label}" definitief verwijderen?`)) return
    try {
      const res = await fetch(`/api/admin/ai-campaigns/scenes?id=${scene.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verwijderen mislukt')
      load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const filtered = useMemo(() => scenes, [scenes])

  return (
    <div className="p-6 max-w-5xl">
      <Link
        href="/admin/ai-campaigns"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Terug naar Campagne AI
      </Link>

      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-6 h-6" /> Scene library
          </h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Pre-goedgekeurde achtergrond- of contextfoto&apos;s die de AI gebruikt om jouw échte MOSE
            kleding in te compositen. De fysieke garment-foto blijft 1:1 bewaard; alleen de scene
            varieert.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ImportFromStorefrontButton
            onImported={(summary) => {
              setMessage(summary)
              load()
            }}
            onError={(e) => setError(e)}
          />
          <label className="inline-flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded border-gray-300"
            />
            Toon ook gearchiveerd
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-800 text-sm flex gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>{message}</div>
        </div>
      )}

      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Upload className="w-5 h-5" /> Nieuwe scene toevoegen
        </h2>
        <div className="grid lg:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Referentie-foto</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="text-xs"
            />
            <p className="text-xs text-gray-500 mt-1">
              Liefst originele resolutie, max 20 MB. JPG/PNG/WEBP.
            </p>
            {filePreview && (
              <FocalPreview
                src={filePreview}
                focalX={focalX}
                focalY={focalY}
                onChange={(x, y) => {
                  setFocalX(x)
                  setFocalY(y)
                }}
              />
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Label *</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="bv. amsterdam-canal-street"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={sceneType}
                onChange={(e) => setSceneType(e.target.value as SceneRow['scene_type'])}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
              >
                {SCENE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Beschrijving</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Locatie, tijd van dag, mood — gebruikt in de scene-keuze prompt."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prompt hint</label>
              <textarea
                value={promptHint}
                onChange={(e) => setPromptHint(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Optioneel: hoe moet het model de scene beschrijven aan Flux Kontext."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Palet (max 8)</label>
              <div className="flex flex-wrap gap-2">
                {paletteHex.map((hex, i) => (
                  <div
                    key={`${hex}-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-white"
                  >
                    <span
                      className="w-4 h-4 rounded border border-gray-200"
                      style={{ background: HEX_RE.test(hex) ? hex : '#ccc' }}
                    />
                    <span className="text-xs font-mono">{hex}</span>
                    <button
                      type="button"
                      onClick={() => setPaletteHex(paletteHex.filter((_, idx) => idx !== i))}
                      className="text-gray-400 hover:text-red-600"
                      aria-label="Verwijder"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {paletteHex.length < 8 && (
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      value={paletteDraft}
                      onChange={(e) => setPaletteDraft(e.target.value)}
                      placeholder="#aabbcc"
                      className="w-24 text-xs font-mono px-2 py-1 border border-gray-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const v = paletteDraft.trim()
                        if (!HEX_RE.test(v)) {
                          setError(`Ongeldige hex: "${v}"`)
                          return
                        }
                        setPaletteHex([...paletteHex, v])
                        setPaletteDraft('')
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-50"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Focal X</label>
                <input
                  type="number"
                  value={focalX}
                  step={0.05}
                  min={0}
                  max={1}
                  onChange={(e) => setFocalX(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Focal Y</label>
                <input
                  type="number"
                  value={focalY}
                  step={0.05}
                  min={0}
                  max={1}
                  onChange={(e) => setFocalY(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={upload}
                disabled={uploading || !file || !label.trim()}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {uploading ? 'Uploaden…' : 'Opslaan'}
              </button>
              {file && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Bestaande scenes {scenes.length > 0 && <span className="text-gray-400">· {scenes.length}</span>}
        </h2>
        {loading ? (
          <div className="animate-pulse text-sm text-gray-500">Scenes laden…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 bg-white">
            Nog geen scenes — voeg er hierboven eentje toe om te beginnen.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <article
                key={s.id}
                className={`bg-white border rounded-xl overflow-hidden shadow-sm transition ${
                  s.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
                }`}
              >
                <div className="relative aspect-[4/5] bg-gray-100">
                  <Image
                    src={s.reference_image_url}
                    alt={s.label}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                  {!s.is_active && (
                    <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wide bg-black/70 text-white px-2 py-0.5 rounded">
                      gearchiveerd
                    </span>
                  )}
                  <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wide bg-white/80 text-gray-800 px-2 py-0.5 rounded">
                    {s.scene_type}
                  </span>
                </div>
                <div className="p-3 text-sm">
                  <div className="font-medium truncate">{s.label}</div>
                  {s.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</p>
                  )}
                  {s.palette_hex.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {s.palette_hex.map((hex) => (
                        <span
                          key={hex}
                          className="w-4 h-4 rounded border border-gray-200"
                          style={{ background: HEX_RE.test(hex) ? hex : '#ccc' }}
                          title={hex}
                        />
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>{s.usage_count} keer gebruikt</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleActive(s)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                      >
                        {s.is_active ? (
                          <>
                            <Archive className="w-3 h-3" /> archiveer
                          </>
                        ) : (
                          <>
                            <ArchiveRestore className="w-3 h-3" /> herstel
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(s)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function FocalPreview({
  src,
  focalX,
  focalY,
  onChange,
}: {
  src: string
  focalX: number
  focalY: number
  onChange: (x: number, y: number) => void
}) {
  return (
    <div
      className="mt-3 relative w-full aspect-[4/5] rounded-md overflow-hidden border border-gray-200 cursor-crosshair bg-gray-100"
      onClick={(e) => {
        const target = e.currentTarget
        const rect = target.getBoundingClientRect()
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
        onChange(Number(x.toFixed(3)), Number(y.toFixed(3)))
      }}
    >
      {/* Preview is a blob URL; <img> is fine and avoids Next/Image domain config */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="preview" className="object-cover w-full h-full" />
      <div
        className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-black bg-white/70"
        style={{ left: `${focalX * 100}%`, top: `${focalY * 100}%` }}
      />
      <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
        klik om focal point te zetten
      </span>
    </div>
  )
}

interface ImportCandidate {
  source: string
  label: string
  scene_type: string
  reference_image_url: string
  already_in_library: boolean
}

function ImportFromStorefrontButton({
  onImported,
  onError,
}: {
  onImported: (summary: string) => void
  onError: (e: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null)

  const openDialog = async () => {
    setOpen(true)
    setLoading(true)
    setCandidates(null)
    try {
      const res = await fetch('/api/admin/ai-campaigns/scenes/import', { cache: 'no-store' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Kon kandidaten niet ophalen')
      setCandidates(body.candidates || [])
    } catch (e) {
      onError((e as Error).message)
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const doImport = async () => {
    try {
      setImporting(true)
      const res = await fetch('/api/admin/ai-campaigns/scenes/import', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Import mislukt')
      onImported(
        `Geïmporteerd: ${body.inserted} nieuwe scene(s), ${body.skipped} al aanwezig.`,
      )
      setOpen(false)
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-50"
      >
        <Plus className="w-3.5 h-3.5" /> Importeer uit lookbook + homepage
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
          onClick={() => !importing && setOpen(false)}
        >
          <div
            className="bg-white max-w-2xl w-full rounded-xl shadow-lg p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Importeer scenes</h3>
                <p className="text-xs text-gray-500 mt-1">
                  We scannen je lookbook-chapters, lookbook-layout, homepage hero/story en
                  about-pagina. Duplicaten worden overgeslagen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !importing && setOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading && (
              <div className="text-sm text-gray-600 py-6 text-center">Laden…</div>
            )}

            {!loading && candidates && candidates.length === 0 && (
              <div className="text-sm text-gray-600 py-6 text-center">
                Geen importeerbare afbeeldingen gevonden in lookbook/homepage/about.
              </div>
            )}

            {!loading && candidates && candidates.length > 0 && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {candidates.map((c) => (
                    <div
                      key={c.reference_image_url}
                      className={`rounded-lg overflow-hidden border ${
                        c.already_in_library ? 'border-gray-200 opacity-60' : 'border-gray-300'
                      }`}
                    >
                      <div className="relative w-full aspect-[4/5] bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.reference_image_url}
                          alt={c.label}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {c.already_in_library && (
                          <span className="absolute top-1 right-1 text-[10px] bg-gray-900/80 text-white px-1.5 py-0.5 rounded">
                            al aanwezig
                          </span>
                        )}
                      </div>
                      <div className="p-2 text-xs">
                        <div className="font-medium text-gray-900 truncate">{c.label}</div>
                        <div className="text-gray-500 truncate">
                          {c.source} · {c.scene_type}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => !importing && setOpen(false)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    Annuleer
                  </button>
                  <button
                    type="button"
                    onClick={doImport}
                    disabled={importing}
                    className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {importing ? 'Importeren…' : 'Importeer nieuwe'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
