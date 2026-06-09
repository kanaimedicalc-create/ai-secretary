import { readTodos, writeTodos, generateId } from '@/lib/todos';

export async function GET() {
  return Response.json(readTodos());
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.title?.trim()) {
    return Response.json({ error: 'title required' }, { status: 400 });
  }
  const todos = readTodos();
  const todo = {
    id: generateId(),
    title: body.title.trim(),
    memo: (body.memo ?? '').trim(),
    priority: body.priority ?? 'medium',
    dueDate: body.dueDate ?? null,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  todos.unshift(todo);
  writeTodos(todos);
  return Response.json(todo, { status: 201 });
}
