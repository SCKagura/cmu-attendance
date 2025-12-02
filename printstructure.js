// Source - https://stackoverflow.com/q
// Posted by pedalpete, modified by community. See post 'Timeline' for change history
// Retrieved 2025-12-02, License - CC BY-SA 4.0

import fs from "fs/promises";
import path from "path";

// Node-friendly CLI: pass directory as first arg, defaults to current directory
async function get_folder(dirPath, tree) {
  try {
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      const entry = tree_entry(file);
      tree.push(entry);
      const full = path.join(dirPath, file);
      const stats = await fs.lstat(full);
      if (stats.isDirectory()) {
        await get_folder(full, entry.children);
      }
    }
  } catch (err) {
    console.error("Error reading", dirPath, err.message);
  }
}

function tree_entry(entry) {
  return { label: entry, children: [] };
}

async function main() {
  const target = process.argv[2] || ".";
  const explorer = [tree_entry(target)];
  await get_folder(target, explorer[0].children);
  console.log(JSON.stringify(explorer, null, 2));
}

main();
