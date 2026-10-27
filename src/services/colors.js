// Todoist-style colors, assigned deterministically.
//
// Todoist lets users pick a color per project and per label; until a schema
// column stores those choices, each project/tag gets a stable color derived
// from its id (djb2 hash over the palette). Chip pairs keep the skill's
// 4.5:1 text-contrast rule: tinted background + darkened text of the same
// hue, with a separate pair per color scheme (test/colors.test.js enforces
// both). chipVars() feeds the pairs to the stylesheet through the --chip-*
// custom properties so CSS can switch schemes via prefers-color-scheme.

const CHIP_COLORS = [
  { name: "berry",  main: "#e56a77", tint: "#fcecec", text: "#ab3a46", tintDark: "#3a2023", textDark: "#f2a0a9" },
  { name: "red",    main: "#e1565b", tint: "#fceaea", text: "#a92e33", tintDark: "#3b1e1f", textDark: "#f19ea1" },
  { name: "orange", main: "#ff9a14", tint: "#fff1de", text: "#8a5300", tintDark: "#3a2a12", textDark: "#ffb85c" },
  { name: "yellow", main: "#f8cd49", tint: "#fdf6d9", text: "#7d6410", tintDark: "#38300f", textDark: "#f8d878" },
  { name: "olive",  main: "#b8b878", tint: "#f4f4e4", text: "#6d6d33", tintDark: "#2e2e1a", textDark: "#cdcd9a" },
  { name: "lime",   main: "#7ecc49", tint: "#eef8e1", text: "#497a1e", tintDark: "#1f3314", textDark: "#a8dd85" },
  { name: "green",  main: "#299438", tint: "#e4f3e6", text: "#1d6b29", tintDark: "#17301b", textDark: "#7ecf8a" },
  { name: "blue",   main: "#4073ff", tint: "#eaedfe", text: "#3351c4", tintDark: "#1d2547", textDark: "#9db1ff" },
  { name: "ocean",  main: "#14aaf5", tint: "#e1f4fd", text: "#0b769f", tintDark: "#12293a", textDark: "#6cc6f8" },
  { name: "purple", main: "#d475f9", tint: "#f8ebfd", text: "#8a35a8", tintDark: "#2f1d3c", textDark: "#e2a6fb" },
  { name: "magenta",main: "#de49ad", tint: "#fceaf5", text: "#9c2a79", tintDark: "#381a2e", textDark: "#ee93d0" },
  { name: "slate",  main: "#808080", tint: "#efefef", text: "#595959", tintDark: "#2e2e2e", textDark: "#b3b3b3" },
];

function hashSeed(id) {
  let hash = 5381;
  for (const char of String(id)) {
    hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

// Solid main color for small graphic marks (project dots, # marks).
export function projectColor(id) {
  return CHIP_COLORS[hashSeed(id) % CHIP_COLORS.length].main;
}

// { main, tint, text, tintDark, textDark } for label-style chips.
export function chipColor(id) {
  return CHIP_COLORS[hashSeed(id) % CHIP_COLORS.length];
}

// Inline style setting the custom properties .tag-chip consumes; the
// stylesheet picks the *-dark pair under prefers-color-scheme: dark.
export function chipVars(id) {
  const colors = chipColor(id);
  return {
    "--chip-text": colors.text,
    "--chip-tint": colors.tint,
    "--chip-text-dark": colors.textDark,
    "--chip-tint-dark": colors.tintDark,
  };
}
