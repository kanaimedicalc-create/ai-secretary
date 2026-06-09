# Conventions

## API
- Routes: `/api/todos` (GET, POST), `/api/todos/[id]` (PUT, DELETE)
- Errors: 400 missing title, 404 not found
- `completedAt` auto-set/cleared in PUT based on `completed` flag

## Types (todo-next/types/todo.ts)
- `Priority`: `'high' | 'medium' | 'low'`
- `Filter`: `'all' | 'pending' | 'done'`
- `Todo`: id, title, memo, priority, dueDate, completed, createdAt, completedAt

## ID generation
- Format: `${Date.now()}-${Math.random().toString(36).slice(2)}` — see `generateId()` in `lib/todos.ts`

## Components
- Single client component: `app/page.tsx` (`"use client"`) — all UI logic in one file
- UI labels, badges, messages: Japanese

## Data layer
- `lib/todos.ts`: `readTodos()` / `writeTodos()` — synchronous fs JSON read/write, server-side only
