// Todoist-style colors, assigned deterministically.
//
// Todoist lets users pick a color per project and per label; until a schema
// column stores those choices, each project/tag gets a stable color derived
// from its id (djb2 hash over the palette). Chip pairs keep the skill's
// 4.5:1 text-contrast rule: tinted background + darkened text of the same hue.

const CHIP_COLORS = [
  { name: "berry",  main: "#e56a77", tint: "#fcecec", text: "#ab3a46" },
  { name: "red",    main: "#e1565b", tint: "#fceaea", text: "#a92e33" },
  { name: "orange", main: "#ff9a14", tint: "#fff1de", text: "#8a5300" },
  { name: "yellow", main: "#f8cd49", tint: "#fdf6d9", text: "#7d6410" },
  { name: "olive",  main: "#b8b878", tint: "#f4f4e4", text: "#6d6d33" },
  { name: "lime",   main: "#7ecc49", tint: "#eef8e1", text: "#4c7d1f" },
  { name: "green",  main: "#299438", tint: "#e4f3e6", text: "#1d6b29" },
  { name: "blue",   main: "#4073ff", tint: "#eaedfe", text: "#3351c4" },
  { name: "ocean",  main: "#14aaf5", tint: "#e1f4fd", text: "#0b769f" },
  { name: "purple", main: "#d475f9", tint: "#f8ebfd", text: "#8a35a8" },
  { name: "magenta",main: "#de49ad", tint: "#fceaf5", text: "#9c2a79" },
  { name: "slate",  main: "#808080", tint: "#efefef", text: "#595959" },
];

function hashSeed(id) {
  let hash = 5381;
  for (const char of String(id)) {
    hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

// Solid main color for small graphic marks (project dots).
export function projectColor(id) {
  return CHIP_COLORS[hashSeed(id) % CHIP_COLORS.length].main;
}

// { main, tint, text } for label-style chips.
export function chipColor(id) {
  return CHIP_COLORS[hashSeed(id) % CHIP_COLORS.length];
}
