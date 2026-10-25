export function validateTagName(value) {
  const name = value.trim();
  const length = Array.from(name).length;

  if (length === 0) {
    return { name, error: "Tag name cannot be empty." };
  }

  if (length > 40) {
    return { name, error: "Tag names must be 40 characters or fewer." };
  }

  return { name, error: "" };
}

export function filterTodosByTag(todos, tagId) {
  if (tagId === "all") return todos;
  return todos.filter((todo) => (todo.tags ?? []).some((tag) => tag.id === tagId));
}
