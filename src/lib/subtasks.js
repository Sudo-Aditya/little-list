export function groupVisibleTodos(todos) {
  const visibleIds = new Set(todos.map((todo) => todo.id));
  const roots = [];
  const childrenByParent = new Map();

  for (const todo of todos) {
    if (todo.parent_task_id === null || !visibleIds.has(todo.parent_task_id)) {
      roots.push(todo);
      continue;
    }
    const children = childrenByParent.get(todo.parent_task_id) ?? [];
    children.push(todo);
    childrenByParent.set(todo.parent_task_id, children);
  }

  return roots.map((todo) => ({
    todo,
    children: childrenByParent.get(todo.id) ?? [],
  }));
}

export function getSubtaskProgress(todos, parentId) {
  const children = todos.filter((todo) => todo.parent_task_id === parentId && todo.deleted_at === null);
  return {
    completed: children.filter((todo) => todo.completed).length,
    total: children.length,
  };
}
