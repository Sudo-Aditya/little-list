export function validateProjectName(value) {
  const name = value.trim();
  const length = Array.from(name).length;

  if (length === 0) {
    return { name, error: "Project name cannot be empty." };
  }

  if (length > 60) {
    return { name, error: "Project names must be 60 characters or fewer." };
  }

  return { name, error: "" };
}

export function moveProject(projects, projectId, direction) {
  const currentIndex = projects.findIndex((project) => project.id === projectId);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= projects.length) return projects;

  const reordered = [...projects];
  [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
  return reordered;
}
