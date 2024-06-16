import fs from "node:fs";
import path from "node:path";
import * as acorn from "acorn";

const parserOpts = { sourceType: "module", ecmaVersion: 6 };

// TODO: create cli
const entryFile = process.argv.slice(2)[0];
const workingDir = path.resolve(path.dirname(entryFile));
const outDir = path.join(workingDir, "dist");

const moduleGraph = createModuleGraph(path.resolve(entryFile));

console.log("Module Graph:");
console.dir(moduleGraph, { depth: null });

/**
 * @typedef {Object} ModuleGraph
 * @property {string} file
 * @property {ModuleGraph[]} imports
 * 
 * @param {string} entry The path to the entry module
 * @returns {ModuleGraph} The module graph
 */
function createModuleGraph(entry) {
  // NOTE: for proper resolution of the module path, see: https://nodejs.org/docs/latest/api/esm.html#resolution-algorithm-specification
  const graphNode = {
    file: entry,
    imports: [],
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

/**
 *
 * @param {ModuleGraph} graph The module graph created with `createModuleGraph`
 * @returns {string} The bundled code
 */
function bundler(graph) {
  // TODO
  return;
}
