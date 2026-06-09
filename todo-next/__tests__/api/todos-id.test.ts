// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT, DELETE } from '@/app/api/todos/[id]/route'
import * as todosLib from '@/lib/todos'
import type { Todo } from '@/types/todo'

vi.mock('@/lib/todos', () => ({
  readTodos: vi.fn(),
  writeTodos: vi.fn(),
}))

const incompleteTodo: Todo = {
  id: 'todo-1',
  title: 'テストタスク',
  memo: '',
  priority: 'medium',
  dueDate: null,
  completed: false,
  createdAt: '2026-06-07T00:00:00.000Z',
  completedAt: null,
}

const completedTodo: Todo = {
  ...incompleteTodo,
  completed: true,
  completedAt: '2026-06-07T10:00:00.000Z',
}

function makeRequest(body: object, id = 'todo-1') {
  return {
    request: new Request(`http://localhost/api/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    params: Promise.resolve({ id }),
  }
}

describe('PUT /api/todos/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(todosLib.writeTodos).mockImplementation(() => {})
  })

  it('completedをtrueに更新するとcompletedAtに現在時刻がセットされる', async () => {
    vi.mocked(todosLib.readTodos).mockReturnValue([{ ...incompleteTodo }])
    const before = new Date().toISOString()
    const { request, params } = makeRequest({ completed: true })

    const response = await PUT(request, { params })
    const data = await response.json()
    const after = new Date().toISOString()

    expect(response.status).toBe(200)
    expect(data.completed).toBe(true)
    expect(data.completedAt).not.toBeNull()
    expect(data.completedAt! >= before).toBe(true)
    expect(data.completedAt! <= after).toBe(true)
  })

  it('completedをfalseに戻すとcompletedAtがnullになる', async () => {
    vi.mocked(todosLib.readTodos).mockReturnValue([{ ...completedTodo }])
    const { request, params } = makeRequest({ completed: false })

    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.completed).toBe(false)
    expect(data.completedAt).toBeNull()
  })

  it('すでに完了済みのTODOを再度完了してもcompletedAtは上書きされない', async () => {
    vi.mocked(todosLib.readTodos).mockReturnValue([{ ...completedTodo }])
    const { request, params } = makeRequest({ completed: true })

    const response = await PUT(request, { params })
    const data = await response.json()

    expect(data.completedAt).toBe(completedTodo.completedAt)
  })

  it('タイトルやメモなどの他フィールドも更新できる', async () => {
    vi.mocked(todosLib.readTodos).mockReturnValue([{ ...incompleteTodo }])
    const { request, params } = makeRequest({ title: '更新後のタイトル', priority: 'high' })

    const response = await PUT(request, { params })
    const data = await response.json()

    expect(data.title).toBe('更新後のタイトル')
    expect(data.priority).toBe('high')
  })

  it('存在しないIDを指定した場合は404を返す', async () => {
    vi.mocked(todosLib.readTodos).mockReturnValue([{ ...incompleteTodo }])
    const { request, params } = makeRequest({ completed: true }, 'nonexistent-id')

    const response = await PUT(request, { params })

    expect(response.status).toBe(404)
    expect(todosLib.writeTodos).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/todos/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(todosLib.writeTodos).mockImplementation(() => {})
  })

  it('指定したIDのTODOを削除してokを返す', async () => {
    const otherTodo: Todo = { ...incompleteTodo, id: 'todo-2', title: '残すタスク' }
    vi.mocked(todosLib.readTodos).mockReturnValue([{ ...incompleteTodo }, otherTodo])

    const request = new Request('http://localhost/api/todos/todo-1', { method: 'DELETE' })
    const params = Promise.resolve({ id: 'todo-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    const writtenTodos = vi.mocked(todosLib.writeTodos).mock.calls[0][0]
    expect(writtenTodos).toHaveLength(1)
    expect(writtenTodos[0].id).toBe('todo-2')
  })

  it('最後の1件を削除すると空配列でwriteTodosを呼ぶ', async () => {
    vi.mocked(todosLib.readTodos).mockReturnValue([{ ...incompleteTodo }])

    const request = new Request('http://localhost/api/todos/todo-1', { method: 'DELETE' })
    const params = Promise.resolve({ id: 'todo-1' })

    await DELETE(request, { params })

    expect(todosLib.writeTodos).toHaveBeenCalledWith([])
  })

  it('存在しないIDでも200を返しリストは変わらない', async () => {
    vi.mocked(todosLib.readTodos).mockReturnValue([{ ...incompleteTodo }])

    const request = new Request('http://localhost/api/todos/nonexistent', { method: 'DELETE' })
    const params = Promise.resolve({ id: 'nonexistent' })

    const response = await DELETE(request, { params })

    expect(response.status).toBe(200)
    const writtenTodos = vi.mocked(todosLib.writeTodos).mock.calls[0][0]
    expect(writtenTodos).toEqual([incompleteTodo])
  })
})
