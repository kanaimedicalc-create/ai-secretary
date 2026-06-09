import fs from 'fs';
import path from 'path';
import { Todo } from '@/types/todo';

const FILE = path.join(process.cwd(), 'todos.json');

export function readTodos(): Todo[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function writeTodos(todos: Todo[]): void {
  fs.writeFileSync(FILE, JSON.stringify(todos, null, 2), 'utf8');
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
