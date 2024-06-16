import path from "node:path";

// TODO: create cli
const entryFile = process.argv.slice(2)[0];
const workingDir = path.resolve(path.dirname(entryFile));
const outDir = path.join(workingDir, "dist");

const moduleGraph = createModuleGraph(path.resolve(entryFile));

console.log("Module Graph:");
console.dir(moduleGraph, { depth: null });


/**
 *
 * @param {import("./graph").ModuleGraph} graph The module graph created with `createModuleGraph`
 * @returns {string} The bundled code
 */
function bundler(graph) {
  // TODO
  return;
}
