const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const TODOS_FILE = path.join(__dirname, 'todos.json');
const HTML_FILE = path.join(__dirname, 'index.html');

function readTodos() {
  try {
    return JSON.parse(fs.readFileSync(TODOS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeTodos(todos) {
  fs.writeFileSync(TODOS_FILE, JSON.stringify(todos, null, 2), 'utf8');
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // HTML
  if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(HTML_FILE, 'utf8'));
    return;
  }

  // GET /api/todos
  if (req.method === 'GET' && pathname === '/api/todos') {
    json(res, 200, readTodos());
    return;
  }

  // POST /api/todos
  if (req.method === 'POST' && pathname === '/api/todos') {
    const body = await getBody(req);
    const todos = readTodos();
    const todo = {
      id: generateId(),
      title: (body.title || '').trim(),
      memo: (body.memo || '').trim(),
      priority: body.priority || 'medium',
      dueDate: body.dueDate || null,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    if (!todo.title) { json(res, 400, { error: 'title required' }); return; }
    todos.unshift(todo);
    writeTodos(todos);
    json(res, 201, todo);
    return;
  }

  // PUT /api/todos/:id
  const idMatch = pathname.match(/^\/api\/todos\/([^/]+)$/);
  if (req.method === 'PUT' && idMatch) {
    const body = await getBody(req);
    const todos = readTodos();
    const idx = todos.findIndex(t => t.id === idMatch[1]);
    if (idx === -1) { json(res, 404, { error: 'not found' }); return; }
    todos[idx] = { ...todos[idx], ...body };
    if (body.completed === true && !todos[idx].completedAt) {
      todos[idx].completedAt = new Date().toISOString();
    }
    if (body.completed === false) todos[idx].completedAt = null;
    writeTodos(todos);
    json(res, 200, todos[idx]);
    return;
  }

  // DELETE /api/todos/:id
  if (req.method === 'DELETE' && idMatch) {
    const todos = readTodos();
    writeTodos(todos.filter(t => t.id !== idMatch[1]));
    json(res, 200, { ok: true });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  let localIP = 'localhost';
  outer: for (const list of Object.values(nets)) {
    for (const iface of list) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break outer;
      }
    }
  }
  console.log('\n🤖 AI Secretary TODO\n');
  console.log(`  Mac:    http://localhost:${PORT}`);
  console.log(`  iPhone: http://${localIP}:${PORT}\n`);
  console.log('Ctrl+C で停止\n');
});
