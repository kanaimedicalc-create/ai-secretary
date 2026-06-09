// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import { readTodos, writeTodos, generateId } from '@/lib/todos'
import type { Todo } from '@/types/todo'

vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}))

const sampleTodos: Todo[] = [
  {
    id: 'todo-1',
    title: 'テストタスク',
    memo: 'メモ',
    priority: 'high',
    dueDate: '2026-06-10',
    completed: false,
    createdAt: '2026-06-07T00:00:00.000Z',
    completedAt: null,
  },
]

describe('readTodos', () => {
  beforeEach(() => {
    vi.mocked(fs.readFileSync).mockReset()
  })

  it('有効なJSONのTODOリストを返す', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(sampleTodos))

    const result = readTodos()

    expect(result).toEqual(sampleTodos)
  })

  it('ファイルが存在しない場合は空配列を返す', () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    })

    const result = readTodos()

    expect(result).toEqual([])
  })

  it('ファイルの内容が不正なJSONの場合は空配列を返す', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('{invalid json}')

    const result = readTodos()

    expect(result).toEqual([])
  })

  it('空のJSONの場合は空配列を返す', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('[]')

    const result = readTodos()

    expect(result).toEqual([])
  })
})

describe('writeTodos', () => {
  beforeEach(() => {
    vi.mocked(fs.writeFileSync).mockReset()
  })

  it('TODOリストをJSON形式（インデント2）でファイルに書き込む', () => {
    writeTodos(sampleTodos)

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('todos.json'),
      JSON.stringify(sampleTodos, null, 2),
      'utf8',
    )
  })

  it('空配列を書き込める', () => {
    writeTodos([])

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('todos.json'),
      '[]',
      'utf8',
    )
  })
})

describe('generateId', () => {
  it('文字列のIDを返す', () => {
    const id = generateId()

    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('連続して呼び出すと毎回異なるIDを返す', () => {
    const ids = Array.from({ length: 10 }, () => generateId())
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(10)
  })

  it('タイムスタンプ-ランダム文字列の形式を持つ', () => {
    const id = generateId()

    expect(id).toMatch(/^\d+-[a-z0-9]+$/)
  })
})
