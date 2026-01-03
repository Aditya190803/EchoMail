module.exports = {
  // TypeScript and JavaScript files
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  // JSON files
  "*.json": ["prettier --write"],
  // CSS files
  "*.css": ["prettier --write"],
  // Markdown files
  "*.md": ["prettier --write"],
  // Type check for TypeScript files (run only once, not per file)
  "*.{ts,tsx}": () => "tsc --noEmit",
};
