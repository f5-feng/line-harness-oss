'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Tag, Segment, SegmentCondition, SegmentRule } from '@line-crm/shared'
import { api } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import Header from '@/components/layout/header'
import SegmentBuilder from '@/components/broadcasts/segment-builder'

// 保存済みセグメントの条件を人間が読める短い文に変換する。
// タグ系ルールは tagId をタグ名へ解決する。
function describeRule(rule: SegmentRule, tagName: (id: string) => string): string {
  switch (rule.type) {
    case 'tag_exists':
      return `タグあり: ${tagName(String(rule.value))}`
    case 'tag_not_exists':
      return `タグなし: ${tagName(String(rule.value))}`
    case 'metadata_equals': {
      const v = rule.value as { key: string; value: string }
      return `メタ ${v.key}=${v.value}`
    }
    case 'metadata_not_equals': {
      const v = rule.value as { key: string; value: string }
      return `メタ ${v.key}≠${v.value}`
    }
    case 'ref_code':
      return `流入: ${String(rule.value)}`
    case 'is_following':
      return 'フォロー中のみ'
    default:
      return ''
  }
}

export default function SegmentsPage() {
  const { selectedAccountId } = useAccount()
  const [segments, setSegments] = useState<Segment[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [segRes, tagRes] = await Promise.all([api.segments.list(), api.tags.list()])
      if (segRes.success) setSegments(segRes.data)
      if (tagRes.success) setTags(tagRes.data)
    } catch {
      setError('読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const tagName = useCallback(
    (id: string) => tags.find((t) => t.id === id)?.name ?? '(不明なタグ)',
    [tags],
  )

  const resetForm = () => {
    setShowForm(false)
    setName('')
  }

  const handleSave = async (conditions: SegmentCondition) => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('セグメント名を入力してください')
      return
    }
    if (conditions.rules.length === 0) {
      setError('条件を1つ以上追加してください')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await api.segments.create({ name: trimmed, conditions })
      if (res.success) {
        resetForm()
        load()
      } else {
        setError('セグメントの保存に失敗しました')
      }
    } catch {
      setError('セグメントの保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (seg: Segment) => {
    if (!confirm(`セグメント「${seg.name}」を削除しますか？`)) return
    try {
      await api.segments.delete(seg.id)
      load()
    } catch {
      setError('削除に失敗しました')
    }
  }

  return (
    <div>
      <Header
        title="セグメント"
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            {showForm ? '閉じる' : '+ 新規セグメント'}
          </button>
        }
      />

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        友だちの絞り込み条件を名前を付けて保存し、配信の作成時に使い回せます。
        条件を組むと該当人数の目安が表示されます。
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">セグメント名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: VIP見込み客"
              autoFocus
              className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <p className="text-xs text-gray-500">下で条件を組み、「適用」を押すと保存されます。</p>
          <SegmentBuilder
            tags={tags}
            accountId={selectedAccountId}
            onApply={handleSave}
            onCancel={resetForm}
          />
          {saving && <p className="text-xs text-gray-400">保存中...</p>}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">名前</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">条件</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">作成日時</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">読み込み中...</td></tr>
              ) : segments.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">保存セグメントがありません。「+ 新規セグメント」から作成してください。</td></tr>
              ) : (
                segments.map((seg) => (
                  <tr key={seg.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{seg.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase mr-1">
                          {seg.conditions.operator === 'AND' ? 'すべて' : 'いずれか'}
                        </span>
                        {seg.conditions.rules.map((rule, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px]"
                          >
                            {describeRule(rule, tagName)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(seg.createdAt).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(seg)}
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
