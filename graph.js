import * as acorn from "acorn";
import fs from "node:fs";

const parserOpts = { sourceType: "module", ecmaVersion: 6 };

/**
 * @typedef {Object} ModuleGraph
 * @property {string} file
 * @property {ModuleGraph[]} imports
 *
 * @param {string} entry The path to the entry module
 * @returns {ModuleGraph} The module graph
 */
export function createModuleGraph(entry) {
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
