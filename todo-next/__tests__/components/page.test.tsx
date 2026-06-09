import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Page from '@/app/page'
import type { Todo } from '@/types/todo'

const pendingTodo: Todo = {
  id: 'todo-1',
  title: '患者カルテを更新する',
  memo: '午前中の診察分',
  priority: 'high',
  dueDate: '2026-06-10',
  completed: false,
  createdAt: '2026-06-07T00:00:00.000Z',
  completedAt: null,
}

const completedTodo: Todo = {
  id: 'todo-2',
  title: '薬の処方箋を確認する',
  memo: '',
  priority: 'medium',
  dueDate: null,
  completed: true,
  createdAt: '2026-06-07T00:00:00.000Z',
  completedAt: '2026-06-07T10:00:00.000Z',
}

/** fetch の応答を順番に返すモックを生成する */
function mockFetchQueue(...responses: unknown[]) {
  const queue = [...responses]
  return vi.fn().mockImplementation(() => {
    const data = queue.length > 0 ? queue.shift() : []
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    })
  })
}

describe('Page コンポーネント — 初期表示', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('TODOが存在しない場合は空のメッセージを表示する', async () => {
    vi.stubGlobal('fetch', mockFetchQueue([]))
    render(<Page />)

    await waitFor(() => {
      expect(screen.getByText(/タスクはありません/)).toBeInTheDocument()
    })
  })

  it('TODOリストのタイトルをすべて表示する', async () => {
    vi.stubGlobal('fetch', mockFetchQueue([pendingTodo, completedTodo]))
    render(<Page />)

    await waitFor(() => {
      expect(screen.getByText('患者カルテを更新する')).toBeInTheDocument()
      expect(screen.getByText('薬の処方箋を確認する')).toBeInTheDocument()
    })
  })

  it('メモが設定されているTODOはメモを表示する', async () => {
    vi.stubGlobal('fetch', mockFetchQueue([pendingTodo]))
    render(<Page />)

    await waitFor(() => {
      expect(screen.getByText('午前中の診察分')).toBeInTheDocument()
    })
  })

  it('未完了件数バッジをヘッダーに表示する', async () => {
    vi.stubGlobal('fetch', mockFetchQueue([pendingTodo, completedTodo]))
    render(<Page />)

    await waitFor(() => {
      expect(screen.getByText('1件')).toBeInTheDocument()
    })
  })

  it('全件数・未完了数・完了数の統計テキストを表示する', async () => {
    vi.stubGlobal('fetch', mockFetchQueue([pendingTodo, completedTodo]))
    render(<Page />)

    await waitFor(() => {
      expect(screen.getByText('全2件 · 未完了1件 · 完了1件')).toBeInTheDocument()
    })
  })

  it('すべて完了した場合は未完了バッジを表示しない', async () => {
    vi.stubGlobal('fetch', mockFetchQueue([completedTodo]))
    render(<Page />)

    await waitFor(() => screen.getByText('薬の処方箋を確認する'))

    expect(screen.queryByText(/^\d+件$/)).not.toBeInTheDocument()
  })
})

describe('Page コンポーネント — タスク追加', () => {
  beforeEach(() => {
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('＋ボタンをクリックすると追加モーダルが開く', async () => {
    vi.stubGlobal('fetch', mockFetchQueue([]))
    const user = userEvent.setup()
    render(<Page />)

    await waitFor(() => screen.getByText(/タスクはありません/))
    await user.click(screen.getByLabelText('追加'))

    expect(screen.getByText('タスクを追加')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('例：報告書を提出する')).toBeInTheDocument()
  })

  it('タイトルを入力して追加するとPOSTリクエストが正しいbodyで送信される', async () => {
    const fetchMock = mockFetchQueue([], { id: 'new-1', title: '新タスク', completed: false }, [])
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<Page />)

    await waitFor(() => screen.getByText(/タスクはありません/))
    await user.click(screen.getByLabelText('追加'))
    await user.type(screen.getByPlaceholderText('例：報告書を提出する'), '新タスク')
    await user.click(screen.getByText('追加する'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/todos',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"title":"新タスク"'),
        }),
      )
    })
  })

  it('Enterキーで追加フォームを送信できる', async () => {
    const fetchMock = mockFetchQueue([], { id: 'new-1', title: 'Enter追加', completed: false }, [])
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<Page />)

    await waitFor(() => screen.getByText(/タスクはありません/))
    await user.click(screen.getByLabelText('追加'))
    await user.type(screen.getByPlaceholderText('例：報告書を提出する'), 'Enter追加{Enter}')

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/todos', expect.objectContaining({ method: 'POST' }))
    })
  })

  it('タイトルが空の場合はPOSTリクエストを送信しない（入力バリデーション）', async () => {
    const fetchMock = mockFetchQueue([])
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<Page />)

    await waitFor(() => screen.getByText(/タスクはありません/))
    await user.click(screen.getByLabelText('追加'))
    await user.click(screen.getByText('追加する'))

    expect(fetchMock).toHaveBeenCalledTimes(1) // 初回GETのみ
  })

  it('優先度ボタンを選択した状態でPOSTリクエストにpriorityが含まれる', async () => {
    const fetchMock = mockFetchQueue([], { id: 'new-1', title: '高優先', completed: false }, [])
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<Page />)

    await waitFor(() => screen.getByText(/タスクはありません/))
    await user.click(screen.getByLabelText('追加'))
    await user.click(screen.getByText('🔴 高'))
    await user.type(screen.getByPlaceholderText('例：報告書を提出する'), '高優先タスク')
    await user.click(screen.getByText('追加する'))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, opts]) => url === '/api/todos' && opts?.method === 'POST',
      )
      expect(call).toBeDefined()
      expect(JSON.parse(call![1].body)).toMatchObject({ priority: 'high' })
    })
  })
})

describe('Page コンポーネント — タスクの完了/未完了', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('未完了タスクのチェックボタンをクリックするとcompleted:trueでPUTリクエストを送信する', async () => {
    const fetchMock = mockFetchQueue(
      [pendingTodo],
      { ...pendingTodo, completed: true, completedAt: new Date().toISOString() },
      [{ ...pendingTodo, completed: true }],
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<Page />)

    await waitFor(() => screen.getByText('患者カルテを更新する'))
    await user.click(screen.getByLabelText('完了にする'))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/todos/todo-1',
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"completed":true'),
      }),
    )
  })

  it('完了済みタスクのチェックボタンをクリックするとcompleted:falseでPUTリクエストを送信する', async () => {
    const fetchMock = mockFetchQueue(
      [completedTodo],
      { ...completedTodo, completed: false, completedAt: null },
      [{ ...completedTodo, completed: false }],
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<Page />)

    await waitFor(() => screen.getByText('薬の処方箋を確認する'))
    await user.click(screen.getByLabelText('未完了に戻す'))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/todos/todo-2',
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"completed":false'),
      }),
    )
  })
})

describe('Page コンポーネント — タスクの削除', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('削除ボタンをクリックしてconfirmするとDELETEリクエストを送信する', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    const fetchMock = mockFetchQueue([pendingTodo], { ok: true }, [])
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<Page />)

    await waitFor(() => screen.getByText('患者カルテを更新する'))
    await user.click(screen.getByLabelText('削除'))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/todos/todo-1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('確認ダイアログでキャンセルするとDELETEリクエストを送信しない', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    const fetchMock = mockFetchQueue([pendingTodo])
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<Page />)

    await waitFor(() => screen.getByText('患者カルテを更新する'))
    await user.click(screen.getByLabelText('削除'))

    expect(fetchMock).toHaveBeenCalledTimes(1) // 初回GETのみ
  })

  it('削除確認ダイアログにタスク名を表示する', async () => {
    const confirmMock = vi.fn(() => false)
    vi.stubGlobal('confirm', confirmMock)
    const fetchMock = mockFetchQueue([pendingTodo])
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<Page />)

    await waitFor(() => screen.getByText('患者カルテを更新する'))
    await user.click(screen.getByLabelText('削除'))

    expect(confirmMock).toHaveBeenCalledWith('「患者カルテを更新する」を削除しますか？')
  })
})

describe('Page コンポーネント — フィルター', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('「未完了」フィルターで未完了のタスクのみ表示する', async () => {
    vi.stubGlobal('fetch', mockFetchQueue([pendingTodo, completedTodo]))
    const user = userEvent.setup()
    render(<Page />)

    await waitFor(() => screen.getByText('患者カルテを更新する'))
    await user.click(screen.getByText('未完了'))

    expect(screen.getByText('患者カルテを更新する')).toBeInTheDocument()
    expect(screen.queryByText('薬の処方箋を確認する')).not.toBeInTheDocument()
  })

  it('「完了済み」フィルターで完了済みのタスクのみ表示する', async () => {
    vi.stubGlobal('fetch', mockFetchQueue([pendingTodo, completedTodo]))
    const user = userEvent.setup()
    render(<Page />)

    await waitFor(() => screen.getByText('患者カルテを更新する'))
    await user.click(screen.getByText('完了済み'))

    expect(screen.queryByText('患者カルテを更新する')).not.toBeInTheDocument()
    expect(screen.getByText('薬の処方箋を確認する')).toBeInTheDocument()
  })

  it('「すべて」フィルターに戻すと全タスクを表示する', async () => {
    vi.stubGlobal('fetch', mockFetchQueue([pendingTodo, completedTodo]))
    const user = userEvent.setup()
    render(<Page />)

    await waitFor(() => screen.getByText('患者カルテを更新する'))
    await user.click(screen.getByText('未完了'))
    await user.click(screen.getByText('すべて'))

    expect(screen.getByText('患者カルテを更新する')).toBeInTheDocument()
    expect(screen.getByText('薬の処方箋を確認する')).toBeInTheDocument()
  })

  it('「すべて」表示では「未完了」と「完了済み」のセクションに分けて表示する', async () => {
    vi.stubGlobal('fetch', mockFetchQueue([pendingTodo, completedTodo]))
    render(<Page />)

    await waitFor(() => screen.getByText('患者カルテを更新する'))

    expect(screen.getByText(/未完了 \(\d+\)/)).toBeInTheDocument()
    expect(screen.getByText(/完了済み \(\d+\)/)).toBeInTheDocument()
  })
})
