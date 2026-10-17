import { filterTodosByTag } from "./tags.js";

export const taskPriorities = ["none", "low", "medium", "high", "urgent"];

export function isTaskPriority(value) {
  return taskPriorities.includes(value);
}

export function filterTodos(todos, filter, priorityFilter = "all", projectFilter = "all", tagFilter = "all") {
  const statusTodos = filter === "Trash"
    ? todos.filter((todo) => todo.deleted_at !== null)
    : todos.filter((todo) => todo.deleted_at === null);

  const filteredTodos = filter === "Active"
    ? statusTodos.filter((todo) => !todo.completed)
    : filter === "Done"
      ? statusTodos.filter((todo) => todo.completed)
      : statusTodos;

  const priorityTodos = priorityFilter === "all"
    ? filteredTodos
    : filteredTodos.filter((todo) => todo.priority === priorityFilter);

  const projectTodos = projectFilter === "all"
    ? priorityTodos
    : projectFilter === "unassigned"
      ? priorityTodos.filter((todo) => todo.project_id === null)
      : priorityTodos.filter((todo) => todo.project_id === projectFilter);

  return filterTodosByTag(projectTodos, tagFilter);
}
