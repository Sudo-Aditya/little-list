export function validateTaskTitle(value) {
  const title = value.trim();
  const length = Array.from(title).length;

  if (length === 0) {
    return { title, error: "Task title cannot be empty." };
  }

  if (length > 200) {
    return { title, error: "Task titles must be 200 characters or fewer." };
  }

  return { title, error: "" };
}
