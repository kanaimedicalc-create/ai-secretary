'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Todo, Priority, Filter } from '@/types/todo';

const PRIORITY_LABEL: Record<Priority, string> = { high: '高', medium: '中', low: '低' };
const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-amber-100 text-amber-600',
  low: 'bg-blue-100 text-blue-600',
};
const BORDER_COLORS: Record<Priority, string> = {
  high: 'border-l-red-400',
  medium: 'border-l-amber-400',
  low: 'border-l-blue-400',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function Page() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch('/api/todos');
    setTodos(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = () => {
    setTitle(''); setMemo(''); setPriority('medium'); setDueDate('');
    setModalOpen(true);
    setTimeout(() => document.getElementById('title-input')?.focus(), 300);
  };

  const addTodo = async () => {
    if (!title.trim()) return;
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, memo, priority, dueDate: dueDate || null }),
    });
    setModalOpen(false);
    await load();
    showToast('タスクを追加しました');
  };

  const toggle = async (todo: Todo) => {
    await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed }),
    });
    await load();
    if (!todo.completed) showToast('完了しました ✓');
  };

  const remove = async (todo: Todo) => {
    if (!confirm(`「${todo.title}」を削除しますか？`)) return;
    await fetch(`/api/todos/${todo.id}`, { method: 'DELETE' });
    await load();
    showToast('削除しました');
  };

  const filtered = filter === 'pending' ? todos.filter(t => !t.completed)
                 : filter === 'done'    ? todos.filter(t => t.completed)
                 : todos;
  const pendingCount = todos.filter(t => !t.completed).length;
  const pendingItems = filtered.filter(t => !t.completed);
  const doneItems    = filtered.filter(t => t.completed);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <div className="max-w-lg mx-auto min-h-dvh flex flex-col">

      {/* Header */}
      <header className="bg-indigo-600 px-5 pt-[max(16px,env(safe-area-inset-top))] pb-5 flex items-center gap-3 sticky top-0 z-10">
        <h1 className="text-white font-bold text-xl flex-1 tracking-tight">📋 TODO</h1>
        {pendingCount > 0 && (
          <span className="bg-white/25 text-white text-xs font-semibold px-3 py-1 rounded-full">
            {pendingCount}件
          </span>
        )}
        <button
          onClick={openModal}
          className="w-9 h-9 rounded-full bg-white text-indigo-600 text-2xl font-light flex items-center justify-center active:scale-90 transition-transform"
          aria-label="追加"
        >＋</button>
      </header>

      {/* Filters */}
      <div className="flex gap-2 px-5 pt-4 pb-2 overflow-x-auto scrollbar-none">
        {(['all', 'pending', 'done'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
              filter === f
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            {{ all: 'すべて', pending: '未完了', done: '完了済み' }[f]}
          </button>
        ))}
      </div>

      {/* Stats */}
      {todos.length > 0 && (
        <p className="text-xs text-gray-400 px-5 pb-2">
          全{todos.length}件 · 未完了{pendingCount}件 · 完了{todos.length - pendingCount}件
        </p>
      )}

      {/* List */}
      <main className="flex-1 px-4 pb-24">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <span className="text-5xl">✅</span>
            <p className="text-sm text-center leading-relaxed">
              タスクはありません<br />右上の ＋ から追加できます
            </p>
          </div>
        ) : (
          <>
            {filter === 'all' && pendingItems.length > 0 && (
              <Section label={`未完了 (${pendingItems.length})`} todos={pendingItems}
                today={today} toggle={toggle} remove={remove} />
            )}
            {filter === 'all' && doneItems.length > 0 && (
              <Section label={`完了済み (${doneItems.length})`} todos={doneItems}
                today={today} toggle={toggle} remove={remove} />
            )}
            {filter !== 'all' && (
              <Section label="" todos={filtered} today={today} toggle={toggle} remove={remove} />
            )}
          </>
        )}
      </main>

      {/* Modal overlay */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 flex items-end"
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="bg-white rounded-t-3xl w-full max-w-lg mx-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-bold text-center mb-5">タスクを追加</h2>

            <Field label="タスク名 *">
              <input
                id="title-input"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTodo()}
                placeholder="例：報告書を提出する"
                className="w-full px-3.5 py-3 border-1.5 border-gray-200 rounded-xl text-base bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </Field>

            <Field label="メモ">
              <textarea
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="詳細・備考など（任意）"
                rows={3}
                className="w-full px-3.5 py-3 border-1.5 border-gray-200 rounded-xl text-base bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white resize-none leading-relaxed transition-colors"
              />
            </Field>

            <Field label="優先度">
              <div className="flex gap-2">
                {(['high', 'medium', 'low'] as Priority[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                      priority === p ? PRIORITY_COLORS[p] + ' border-current' : 'bg-slate-50 border-gray-200 text-gray-400'
                    }`}
                  >
                    {{ high: '🔴 高', medium: '🟡 中', low: '🔵 低' }[p]}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="期限">
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3.5 py-3 border-1.5 border-gray-200 rounded-xl text-base bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </Field>

            <button
              onClick={addTodo}
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl mt-2 active:scale-[0.98] transition-transform"
            >
              追加する
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm font-medium px-5 py-2.5 rounded-full z-30 whitespace-nowrap shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>}
      {children}
    </div>
  );
}

function Section({ label, todos, today, toggle, remove }: {
  label: string;
  todos: Todo[];
  today: Date;
  toggle: (t: Todo) => void;
  remove: (t: Todo) => void;
}) {
  return (
    <>
      {label && <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-3 pb-2 px-1">{label}</p>}
      {todos.map(todo => {
        const isOverdue = todo.dueDate && !todo.completed && new Date(todo.dueDate + 'T00:00:00') < today;
        return (
          <div
            key={todo.id}
            className={`bg-white rounded-2xl p-4 mb-2.5 flex items-start gap-3 shadow-sm border-l-4 ${
              todo.completed ? 'border-l-gray-200 opacity-55' : BORDER_COLORS[todo.priority]
            }`}
          >
            <button
              onClick={() => toggle(todo)}
              className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center text-xs text-white transition-colors ${
                todo.completed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
              }`}
              aria-label={todo.completed ? '未完了に戻す' : '完了にする'}
            >
              {todo.completed && '✓'}
            </button>

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-snug ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                {todo.title}
              </p>
              {todo.memo && (
                <p className="text-xs text-gray-400 mt-1 leading-relaxed whitespace-pre-wrap">{todo.memo}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${PRIORITY_COLORS[todo.priority]}`}>
                  {PRIORITY_LABEL[todo.priority]}
                </span>
                {todo.dueDate && (
                  <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                    {isOverdue ? '⚠️' : '📅'} {formatDate(todo.dueDate)}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => remove(todo)}
              className="text-gray-300 text-lg p-1 rounded-lg active:bg-red-50 active:text-red-400 transition-colors flex-shrink-0"
              aria-label="削除"
            >🗑</button>
          </div>
        );
      })}
    </>
  );
}
