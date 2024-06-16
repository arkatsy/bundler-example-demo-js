import fs from "node:fs";
import path from "node:path";
import * as acorn from "acorn";

const parserOpts = { sourceType: "module", ecmaVersion: 6 };

const entryFile = process.argv.slice(2)[0];
const workingDir = path.resolve(path.dirname(entryFile));
const outDir = path.join(workingDir, "dist");

const moduleGraph = createModuleGraph(path.resolve(entryFile));
console.dir(moduleGraph, { depth: null });

function createModuleGraph(entry) {
  const graphNode = {
    file: entry,
    imports: null,
  };

  const source = fs.readFileSync(entry, "utf-8");
  const imports = acorn.parse(source, parserOpts).body.filter((node) => node.type === "ImportDeclaration");

  graphNode.imports = imports.map((node) => {
    const specifier = node.source.value;
    const modulePath = path.resolve(workingDir, path.basename(specifier));
    return createModuleGraph(modulePath);
  });

  return graphNode;
}
