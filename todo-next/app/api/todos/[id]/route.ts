import type { NextRequest } from 'next/server';
import { readTodos, writeTodos } from '@/lib/todos';

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<'/api/todos/[id]'>
) {
  const { id } = await ctx.params;
  const body = await request.json();
  const todos = readTodos();
  const idx = todos.findIndex((t) => t.id === id);
  if (idx === -1) return Response.json({ error: 'not found' }, { status: 404 });

  todos[idx] = { ...todos[idx], ...body };
  if (body.completed === true && !todos[idx].completedAt) {
    todos[idx].completedAt = new Date().toISOString();
  }
  if (body.completed === false) todos[idx].completedAt = null;
  writeTodos(todos);
  return Response.json(todos[idx]);
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<'/api/todos/[id]'>
) {
  const { id } = await ctx.params;
  const todos = readTodos();
  writeTodos(todos.filter((t) => t.id !== id));
  return Response.json({ ok: true });
}
