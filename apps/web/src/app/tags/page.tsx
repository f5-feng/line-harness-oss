'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Tag } from '@line-crm/shared'
import { api } from '@/lib/api'
import Header from '@/components/layout/header'

// 新規作成フォームの初期色。配信ボタン等と同じ LINE グリーンを既定にする。
const DEFAULT_COLOR = '#06C755'

// カラーピッカーの候補。任意の HEX も入力できるが、よく使う色をワンタップで選べるようにする。
const PRESET_COLORS = ['#06C755', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#6B7280']

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.tags.list()
      if (res.success) setTags(res.data)
    } catch {
      setError('読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setShowForm(false)
    setName('')
    setColor(DEFAULT_COLOR)
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('タグ名を入力してください')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await api.tags.create({ name: trimmed, color })
      if (res.success) {
        resetForm()
        load()
      } else {
        setError('タグの作成に失敗しました')
      }
    } catch {
      setError('タグの作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`タグ「${tag.name}」を削除しますか？\n友だちに付いているこのタグも外れます。`)) return
    try {
      await api.tags.delete(tag.id)
      load()
    } catch {
      setError('削除に失敗しました')
    }
  }

  return (
    <div>
      <Header
        title="タグ管理"
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: DEFAULT_COLOR }}
          >
            {showForm ? '閉じる' : '+ 新規タグ'}
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1">タグ名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                placeholder="例: VIP顧客"
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">色</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
                  aria-label="タグの色"
                />
                <div className="flex gap-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-6 w-6 rounded-full border-2 ${color.toLowerCase() === c.toLowerCase() ? 'border-gray-800' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      aria-label={`色 ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: DEFAULT_COLOR }}
            >
              {saving ? '作成中...' : '作成'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">タグ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">色</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">作成日時</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">読み込み中...</td></tr>
              ) : tags.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">タグがありません。「+ 新規タグ」から作成してください。</td></tr>
              ) : (
                tags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="h-3 w-3 rounded-full border border-gray-200" style={{ backgroundColor: tag.color }} />
                        {tag.color}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(tag.createdAt).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(tag)}
                        className="px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded-md"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
