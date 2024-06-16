import fs from "node:fs";
import path from "node:path";
import * as acorn from "acorn";

const parserOpts = { sourceType: "module", ecmaVersion: 6 };

const entryFile = process.argv.slice(2)[0];
const workingDir = path.resolve(path.dirname(entryFile));
const outDir = path.join(workingDir, "dist");

const moduleGraph = resolveModule(path.resolve(entryFile));

// NOTE: `entry` is a file path
function resolveModule(entry) {
  console.log("[module]: ", entry);
  const source = fs.readFileSync(entry, "utf-8");
  const imports = acorn.parse(source, parserOpts).body.filter((node) => node.type === "ImportDeclaration");
  imports.forEach((node) => {
    const specifier = node.source.value;
    // NOTE: Doesn't handle node_modules
    const modulePath = path.resolve(workingDir, path.basename(specifier));
    resolveModule(modulePath);
  });
}
