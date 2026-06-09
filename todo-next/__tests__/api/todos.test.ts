// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/todos/route'
import * as todosLib from '@/lib/todos'
import type { Todo } from '@/types/todo'

vi.mock('@/lib/todos', () => ({
  readTodos: vi.fn(),
  writeTodos: vi.fn(),
  generateId: vi.fn(),
}))

const existingTodos: Todo[] = [
  {
    id: 'todo-1',
    title: '既存のタスク',
    memo: '',
    priority: 'medium',
    dueDate: null,
    completed: false,
    createdAt: '2026-06-07T00:00:00.000Z',
    completedAt: null,
  },
]

describe('GET /api/todos', () => {
  it('保存されているTODOリストをすべて返す', async () => {
    vi.mocked(todosLib.readTodos).mockReturnValue(existingTodos)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(existingTodos)
  })

  it('TODOが存在しない場合は空配列を返す', async () => {
    vi.mocked(todosLib.readTodos).mockReturnValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })
})

describe('POST /api/todos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(todosLib.readTodos).mockReturnValue([...existingTodos])
    vi.mocked(todosLib.writeTodos).mockImplementation(() => {})
    vi.mocked(todosLib.generateId).mockReturnValue('new-todo-id')
  })

  it('必須フィールドだけで新しいTODOを作成して返す', async () => {
    const request = new Request('http://localhost/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新しいタスク' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('new-todo-id')
    expect(data.title).toBe('新しいタスク')
    expect(data.completed).toBe(false)
    expect(data.completedAt).toBeNull()
    expect(data.createdAt).toBeDefined()
  })

  it('オプションフィールド（memo・priority・dueDate）を正しく保存する', async () => {
    const request = new Request('http://localhost/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'フルタスク',
        memo: '詳細メモ',
        priority: 'high',
        dueDate: '2026-06-15',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.memo).toBe('詳細メモ')
    expect(data.priority).toBe('high')
    expect(data.dueDate).toBe('2026-06-15')
  })

  it('タイトルの前後の空白を除去して保存する', async () => {
    const request = new Request('http://localhost/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '  前後に空白あり  ' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.title).toBe('前後に空白あり')
  })

  it('新しいTODOをリストの先頭に追加してwriteTodosを呼ぶ', async () => {
    const request = new Request('http://localhost/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '先頭に追加' }),
    })

    await POST(request)

    const writtenTodos = vi.mocked(todosLib.writeTodos).mock.calls[0][0]
    expect(writtenTodos[0].title).toBe('先頭に追加')
    expect(writtenTodos[1]).toEqual(existingTodos[0])
  })

  it('タイトルがない場合は400を返す', async () => {
    const request = new Request('http://localhost/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo: 'タイトルなし' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(todosLib.writeTodos).not.toHaveBeenCalled()
  })

  it('タイトルが空文字の場合は400を返す', async () => {
    const request = new Request('http://localhost/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('タイトルが空白のみの場合は400を返す（境界値）', async () => {
    const request = new Request('http://localhost/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '   ' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})
