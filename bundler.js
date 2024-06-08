import fs from "node:fs";
import path from "node:path";
import * as acorn from "acorn";
import { walk } from "estree-walker";
import { generate } from "escodegen";

const parserOpts = { sourceType: "module", ecmaVersion: 6 };

const entryFile = process.argv.slice(2)[0];
const entryDir = path.dirname(entryFile);
const bundleDir = path.join(entryDir, "dist");

const entryCode = fs.readFileSync(entryFile, "utf-8");

// Grab the import paths from the entry file
const entryAST = acorn.parse(entryCode, parserOpts);
const imports = entryAST.body.filter((node) => node.type === "ImportDeclaration");
const importPaths = imports.map((node) => node.source.value);

// Grab the code of the imported modules (also modify AST to remove exports)
const externalCode = importPaths.map((importPath) => {
  const modulePath = path.resolve(entryDir, importPath);
  const moduleCode = fs.readFileSync(modulePath, "utf-8");
  const moduleAST = acorn.parse(moduleCode, parserOpts);

  walk(moduleAST, {
    enter(node) {
      if (node.type === "ExportNamedDeclaration") {
        this.replace(node.declaration);
      }
    },
  });

  return generate(moduleAST);
});

// remove the imports from the entry file
walk(entryAST, {
  enter(node) {
    if (node.type === "ImportDeclaration") {
      this.remove();
    }
  },
});

const entryCodeNoImports = generate(entryAST);

const bundleCode = `${externalCode.join("\n")}\n${entryCodeNoImports}`;

if(!fs.existsSync(bundleDir)) {
  fs.mkdirSync(bundleDir);
}

fs.writeFileSync(path.join(bundleDir, "bundle.js"), bundleCode);