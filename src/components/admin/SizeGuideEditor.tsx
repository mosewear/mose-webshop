'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'

type SizeGuideType = 'table' | 'specs'

interface TableData {
  type: 'table'
  columns: string[]
  rows: string[][]
  how_to_measure?: { label: string; description: string }[]
}

interface SpecsData {
  type: 'specs'
  fields: { label: string; value: string }[]
  care_instructions?: { label: string; description: string }[]
}

type SizeGuideContent = TableData | SpecsData | null

interface Props {
  initialContent: SizeGuideContent
  sizeGuideType: 'clothing' | 'watch' | 'accessory' | 'shoes' | 'jewelry' | 'none'
  onChange: (content: SizeGuideContent) => void
}

export default function SizeGuideEditor({ initialContent, sizeGuideType, onChange }: Props) {
  const [content, setContent] = useState<SizeGuideContent>(initialContent)

  // Determine default structure based on type
  const getDefaultContent = (): SizeGuideContent => {
    if (sizeGuideType === 'watch' || sizeGuideType === 'accessory' || sizeGuideType === 'jewelry') {
      return {
        type: 'specs',
        fields: [
          { label: '', value: '' }
        ],
        care_instructions: []
      }
    } else if (sizeGuideType === 'clothing' || sizeGuideType === 'shoes') {
      return {
        type: 'table',
        columns: ['Maat', 'Borst (cm)', 'Lengte (cm)', 'Schouders (cm)'],
        rows: [['S', '', '', '']],
        how_to_measure: []
      }
    }
    return null
  }

  const handleInitialize = () => {
    const defaultContent = getDefaultContent()
    setContent(defaultContent)
    onChange(defaultContent)
  }

  const handleClear = () => {
    setContent(null)
    onChange(null)
  }

  // TABLE HANDLERS
  const handleAddRow = () => {
    if (!content || content.type !== 'table') return
    const newRow = content.columns.map(() => '')
    const updated = { ...content, rows: [...content.rows, newRow] }
    setContent(updated)
    onChange(updated)
  }

  const handleRemoveRow = (index: number) => {
    if (!content || content.type !== 'table') return
    const updated = { ...content, rows: content.rows.filter((_, i) => i !== index) }
    setContent(updated)
    onChange(updated)
  }

  const handleUpdateCell = (rowIndex: number, colIndex: number, value: string) => {
    if (!content || content.type !== 'table') return
    const updated = {
      ...content,
      rows: content.rows.map((row, i) =>
        i === rowIndex ? row.map((cell, j) => (j === colIndex ? value : cell)) : row
      )
    }
    setContent(updated)
    onChange(updated)
  }

  const handleUpdateColumn = (index: number, value: string) => {
    if (!content || content.type !== 'table') return
    const updated = {
      ...content,
      columns: content.columns.map((col, i) => (i === index ? value : col))
    }
    setContent(updated)
    onChange(updated)
  }

  // SPECS HANDLERS
  const handleAddField = () => {
    if (!content || content.type !== 'specs') return
    const updated = {
      ...content,
      fields: [...content.fields, { label: '', value: '' }]
    }
    setContent(updated)
    onChange(updated)
  }

  const handleRemoveField = (index: number) => {
    if (!content || content.type !== 'specs') return
    const updated = {
      ...content,
      fields: content.fields.filter((_, i) => i !== index)
    }
    setContent(updated)
    onChange(updated)
  }

  const handleUpdateField = (index: number, field: 'label' | 'value', value: string) => {
    if (!content || content.type !== 'specs') return
    const updated = {
      ...content,
      fields: content.fields.map((f, i) =>
        i === index ? { ...f, [field]: value } : f
      )
    }
    setContent(updated)
    onChange(updated)
  }

  if (sizeGuideType === 'none') {
    return (
      <div className="bg-gray-100 border-2 border-gray-300 p-6 text-center">
        <p className="text-gray-600">
          Size guide type is set to "none". No content editor needed.
        </p>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="bg-blue-50 border-2 border-blue-300 p-6">
        <p className="text-sm text-gray-700 mb-4">
          No size guide content configured. Click below to create a template.
        </p>
        <button
          onClick={handleInitialize}
          className="bg-brand-primary text-white px-6 py-2 font-bold uppercase hover:bg-brand-primary-hover transition-colors"
        >
          + Create Template
        </button>
      </div>
    )
  }

  // RENDER TABLE EDITOR
  if (content.type === 'table') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Size Table Editor</h3>
          <button
            onClick={handleClear}
            className="text-red-600 hover:text-red-800 text-sm font-semibold"
          >
            Clear Content
          </button>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-4 gap-2">
          {content.columns.map((col, i) => (
            <input
              key={i}
              type="text"
              value={col}
              onChange={(e) => handleUpdateColumn(i, e.target.value)}
              placeholder={`Column ${i + 1}`}
              className="px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm font-bold"
            />
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {content.rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <div className="grid grid-cols-4 gap-2 flex-1">
                {row.map((cell, colIndex) => (
                  <input
                    key={colIndex}
                    type="text"
                    value={cell}
                    onChange={(e) => handleUpdateCell(rowIndex, colIndex, e.target.value)}
                    placeholder={content.columns[colIndex]}
                    className="px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm"
                  />
                ))}
              </div>
              <button
                onClick={() => handleRemoveRow(rowIndex)}
                className="p-2 text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleAddRow}
          className="flex items-center gap-2 text-brand-primary hover:underline font-semibold text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Row
        </button>
      </div>
    )
  }

  // RENDER SPECS EDITOR
  if (content.type === 'specs') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Specifications Editor</h3>
          <button
            onClick={handleClear}
            className="text-red-600 hover:text-red-800 text-sm font-semibold"
          >
            Clear Content
          </button>
        </div>

        <div className="space-y-2">
          {content.fields.map((field, index) => (
            <div key={index} className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={field.label}
                onChange={(e) => handleUpdateField(index, 'label', e.target.value)}
                placeholder="Label (e.g., Kastmaat)"
                className="px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm font-bold w-1/3"
              />
              <input
                type="text"
                value={field.value}
                onChange={(e) => handleUpdateField(index, 'value', e.target.value)}
                placeholder="Value (e.g., 42mm diameter)"
                className="px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm flex-1"
              />
              <button
                onClick={() => handleRemoveField(index)}
                className="p-2 text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleAddField}
          className="flex items-center gap-2 text-brand-primary hover:underline font-semibold text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Field
        </button>
      </div>
    )
  }

  return null
}


