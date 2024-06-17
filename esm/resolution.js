import fs from "node:fs";
import module from "node:module";
import { includesAny, isValidURL } from "./helpers";
import {
  ModuleNotFound,
  InvalidModuleSpecifier,
  UnsupportedDirectoryImport,
  PackagePathNotExported,
  PackageImportNotDefined,
  InvalidPackageConfiguration,
  InvalidPackageTarget,
} from "./errors";
import * as acorn from "acorn";

/**
 *
 * @param {string} specifier
 * @param {string} parentURL
 */
function ESM_RESOLVE(specifier, parentURL) {
  let resolved;
  if (isValidURL(specifier)) {
    // 2.1 Set resolved to the result of parsing and reserializing specifier as a URL.
    resolved = new URL(specifier, parentURL).toString();
  } else if (includesAny(specifier, ["/", "./", "../"])) {
    // 3.1 Set resolved to the URL resolution of specifier relative to parentURL.
    resolved = new URL(specifier, parentURL).toString();
  } else if (specifier.startsWith("#")) {
    // 4.1 Set resolved to the result of PACKAGE_IMPORTS_RESOLVE(specifier, parentURL, defaultConditions).
    resolved = PACKAGE_IMPORTS_RESOLVE(specifier, parentURL, defaultConditions);
  } else {
    // 5.2 Set resolved the result of PACKAGE_RESOLVE(specifier, parentURL).
    resolved = PACKAGE_RESOLVE(specifier, parentURL);
  }

  let format;
  if (resolved.startsWith("file:")) {
    if (includesAny(resolved, ["%2F", "%5C"])) {
      // 7.1 If resolved contains any percent encodings of "/" or "\" ("%2F" and "%5C" respectively),
      // then throw an Invalid Module Specifier error.
      throw new InvalidModuleSpecifier(`Found %2F or %5C in resolved URL: ${resolved}`);
    }

    if (fs.existsSync(resolved) && fs.lstatSync(resolved).isDirectory()) {
      // 7.2 If the file at resolved is a directory,
      // then throw an Unsupported Directory Import error.
      throw new UnsupportedDirectoryImport(`Directory imports are not supported: ${resolved}`);
    }

    if (!fs.existsSync(resolved)) {
      // 7.3 If the file at resolved does not exist, then
      // throw a Module Not Found error.
      throw new ModuleNotFound(`Module not found: ${resolved}`);
    }

    // 7.4 Set resolved to the real path of resolved, maintaining the same URL querystring and fragment components.
    resolved = fs.realpathSync(resolved);

    // 7.5 Set format to the module format of the file at resolved.
    format = ESM_FILE_FORMAT(resolved);
  } else {
    // 8.1 Set format the module format of the content type associated with the URL resolved.
    format = new URL(resolved).protocol.slice(0, -1);
  }

  return { resolved, format };
}

/**
 *
 * @param {string} packageSpecifier
 * @param {string} parentURL
 */
function PACKAGE_RESOLVE(packageSpecifier, parentURL) {
  let packageName;

  if (!packageSpecifier.length) {
    // 2.1 Throw an Invalid Module Specifier error.
    throw new InvalidModuleSpecifier("Empty package specifier");
  }
  if (module.isBuiltin(packageSpecifier)) {
    // 3.1 Return the string "node:" concatenated with packageSpecifier.
    return `node:${packageSpecifier}`;
  }
  if (!packageSpecifier.startsWith("@")) {
    // 4.1 Set packageName to the substring of packageSpecifier until the first "/" separator or the end of the string.
    packageName = packageSpecifier.split("/")[0];
  } else {
    if (!packageSpecifier.includes("/")) {
      // 5.1 If packageSpecifier does not contain a "/" separator,
      // then throw an Invalid Module Specifier error.
      throw new InvalidModuleSpecifier(`Invalid package specifier: ${packageSpecifier}`);
    }

    // 5.2 Set packageName to the substring of packageSpecifier until the second "/" separator or the end of the string.
    packageName = packageSpecifier.split("/").slice(0, 2).join("/");
  }

  if (packageName.startsWith(".") || includesAny(packageName, ["\\", "%"])) {
    // 6.1 If packageName starts with "." or contains "\" or "%",
    // then throw an Invalid Module Specifier error.
    throw new InvalidModuleSpecifier(`Invalid package name: ${packageName}`);
  }
  // 7. Let packageSubpath be "." concatenated with the substring of packageSpecifier from the position at the length of packageName.
  let packageSubpath = packageSpecifier.slice(packageName.length);

  if (packageSubpath.endsWith("/")) {
    // 8. If packageSubpath ends in "/",
    // then throw an Invalid Module Specifier error.
    throw new InvalidModuleSpecifier(`Invalid package subpath: ${packageSubpath}`);
  }

  let selfUrl = PACKAGE_SELF_RESOLVE(packageName, packageSubpath, parentURL);
  if (selfUrl) return selfUrl;

  // 11. While parentURL is not the file system root,
  // NOTE: Unsure about this
  while (parentURL !== "file://") {
    // 11.1 Let packageURL be the URL resolution of "node_modules/" concatenated with packageSpecifier, relative to parentURL.
    let packageURL = new URL(`node_modules/${packageSpecifier}`, parentURL).toString();
    // 11.2 Set parentURL to the parent folder URL of parentURL.
    parentURL = new URL("../", parentURL).toString();

    // 11.3 If the folder at packageURL does not exist, then continue the next loop iteration.
    if (!fs.existsSync(packageURL)) continue;

    let pjson = READ_PACKAGE_JSON(packageURL);
    if (pjson && pjson.exports) {
      return PACKAGE_EXPORTS_RESOLVE(packageURL, packageSubpath, pjson.exports, defaultConditions);
    } else if (packageSubpath === "." && typeof pjson.main === "string") {
      // 11.6 Otherwise, if packageSubpath is equal to ".", then
      // if pjson.main is a string, then
      // return the URL resolution of main in packageURL.
      return new URL(pjson.main, packageURL).toString();
    } else {
      // 11.7 Otherwise, return the URL resolution of packageSubpath in packageURL.
      return new URL(packageSubpath, packageURL).toString();
    }
  }
  throw new ModuleNotFound(`Module not found: ${packageSpecifier}`);
}

function PACKAGE_SELF_RESOLVE(packageName, packageSubpath, parentURL) {
  let packageURL = LOOK_UP_PACKAGE_JSON(parentURL);
  if (!packageURL) return;

  let pjson = READ_PACKAGE_JSON(parentURL);
  if (!pjson || !pjson.exports) return;

  if (pjson.name === packageName) {
    return PACKAGE_EXPORTS_RESOLVE(packageURL, packageSubpath, pjson.exports, defaultConditions);
  } else return;
}

function PACKAGE_EXPORTS_RESOLVE(packageURL, subpath, exports, conditions) {
  // If exports is an Object with both a key starting with "." and a key not starting with ".", throw an Invalid Package Configuration error.
  if (typeof exports === "object") {
    const props = Object.getOwnPropertyNames(exports);
    let dotProp = props.find((prop) => prop.startsWith("."));
    let nonDotProp = props.find((prop) => !prop.startsWith("."));
    if (dotProp && nonDotProp) {
      throw new InvalidPackageConfiguration(`Invalid package configuration: ${packageURL}`);
    }
  }

  if (subpath === ".") {
    let mainExport;
    if (typeof exports === "string" || typeof exports === "object") {
      if (!exports["."]) {
        // 2.2 If exports is a String or Array, or an Object containing no keys starting with ".", then set mainExport to exports.
        mainExport = exports;
      } else if (typeof exports === "object" && exports["."]) {
        // 2.3 Otherwise if exports is an Object containing a "." property, then set mainExport to exports["."].
        mainExport = exports["."];
      }

      if (mainExport) {
        // 2.4 If mainExport is not undefined, then
        // Let resolved be the result of PACKAGE_TARGET_RESOLVE( packageURL, mainExport, null, false, conditions).
        // If resolved is not null or undefined, return resolved.
        let resolved = PACKAGE_TARGET_RESOLVE(packageURL, mainExport, null, false, conditions);
        if (resolved) return resolved;
      }
    } else if (typeof exports === "object" && Object.keys(exports).every((key) => key.startsWith("."))) {
      // 3.1 Assert: subpath begins with "./".
      if (!subpath.startsWith(".")) throw new Error("subpath must begin with ./");
      let resolved = PACKAGE_IMPORTS_EXPORTS_RESOLVE(subpath, exports, packageURL, false, conditions);
      if (resolved) return resolved;
    }
  }
  throw new PackagePathNotExported(`Package path not exported: ${packageURL}`);
}

function PACKAGE_IMPORTS_RESOLVE(specifier, parentURL, conditions) {
  if (specifier.startsWith("#")) throw new InvalidModuleSpecifier(`Invalid package specifier: ${specifier}`);
  let packageURL = LOOK_UP_PACKAGE_SCOPE(parentURL);
  if (packageJSON) {
    let pjson = READ_PACKAGE_JSON(packageURL);

    // 4.2 If pjson.imports is a non-null Object, then
    // Let resolved be the result of PACKAGE_IMPORTS_EXPORTS_RESOLVE( specifier, pjson.imports, packageURL, true, conditions).
    // If resolved is not null or undefined, return resolved.

    // NOTE: Unsure what 'non-null' Object means
    if (pjson.imports && typeof pjson.imports) {
      let resolved = PACKAGE_IMPORTS_EXPORTS_RESOLVE(specifier, pjson.imports, packageURL, true, conditions);
      if (resolved) return resolved;
    }
  }

  throw new PackageImportNotDefined(`Package import not defined: ${packageURL}`);
}

function PACKAGE_IMPORTS_EXPORTS_RESOLVE(matchKey, matchObj, packageURL, isImports, conditions) {
  if (!matchKey.includes("*") && matchObj[matchKey]) {
    let target = matchObj[matchKey];
    return PACKAGE_TARGET_RESOLVE(packageURL, target, null, isImports, conditions);
  }

  // 2. Let expansionKeys be the list of keys of matchObj containing only a single "*", sorted by the sorting function PATTERN_KEY_COMPARE which orders in descending order of specificity.
  let expansionKeys = Object.getOwnPropertyNames(matchObj)
    .filter((key) => key.includes("*"))
    .sort(PATTERN_KEY_COMPARE);

  for (let key of expansionKeys) {
    // 3.1 Let patternBase be the substring of expansionKey up to but excluding the first "*" character.
    let patternBase = expansionKeys.split("*")[0];

    // 3.2 If matchKey starts with but is not equal to patternBase, then
    if (matchKey.startsWith(patternBase) && matchKey !== patternBase) {
      // 3.2.1 Let patternTrailer be the substring of expansionKey from the index after the first "*" character.
      let patternTrailer = expansionKey.split("*")[1];

      // 3.2.2 If patternTrailer has zero length, or if matchKey ends with patternTrailer and the length of matchKey is greater than or equal to the length of expansionKey, then
      if (!patternTrailer.length || (matchKey.endsWith(patternTrailer) && matchKey.length >= expansionKey.length)) {
        let target = matchObj[expansionKey];

        // 3.2.2.2 Let patternMatch be the substring of matchKey starting at the index of the length of patternBase up to the length of matchKey minus the length of patternTrailer.
        let patternMatch = matchKey.slice(patternBase.length, matchKey.length - patternTrailer.length);
        return PACKAGE_TARGET_RESOLVE(packageURL, target, patternMatch, isIMports, conditions);
      }
    }
  }
  return null;
}

function PATTERN_KEY_COMPARE(keyA, keyB) {
  function containsOnlyOnce(str, char) {
    return str.indexOf(char) === str.lastIndexOf(char);
  }
  if (!(containsOnlyOnce(keyA, "*") && containsOnlyOnce(keyB, "*"))) {
    throw new Error("Pattern keys must contain only one * character");
  }

  let baseLengthA = keyA.indexOf("*");
  let baseLengthB = keyB.indexOf("*");

  if (baseLengthA > baseLengthB) return -1;
  if (baseLengthA < baseLengthB) return 1;

  if (keyA.length > keyB.length) return -1;
  if (keyA.length < keyB.length) return 1;

  return 0;
}

function PACKAGE_TARGET_RESOLVE(packageURL, target, patternMatch, isImports, conditions) {
  if (typeof target === "string") {
    if (!target.startsWith("./")) {
      if (!isImports || includesAny(target, ["../", "/"]) || isValidURL(target)) {
        throw InvalidPackageTarget(`Invalid package target: ${target}`);
      }

      if (typeof patternMatch === "string") {
        // 1.1.2.1 Return PACKAGE_RESOLVE(target with every instance of "*" replaced by patternMatch, packageURL + "/").
        return PACKAGE_RESOLVE(target.replace("*", patternMatch), packageURL + "/");
      }

      return PACKAGE_RESOLVE(target, packageURL + "/");
    }

    // 1.2 If target split on "/" or "\" contains any "", ".", "..", or "node_modules" segments after the first "." segment, case insensitive and including percent encoded variants, throw an Invalid Package Target error.
    // NOTE: Unsure about the quotes and the percent encoded variants
    let forwardSlashSegments = target.split("/");
    let backSlashSegments = target.split("\\");
    let forwardSlashAfterDot = forwardSlashSegments
      .slice(forwardSlashSegments.indexOf(".") + 1)
      .map((segment) => segment.toLowerCase());
    let backSlashAfterDot = backSlashSegments.slice(backSlashSegments.indexOf(".") + 1).map((segment) => segment.toLowerCase());
    if (
      includesAny(forwardSlashAfterDot, [".", "..", "node_modules"]) ||
      includesAny(backSlashAfterDot, [".", "..", "node_modules"])
    ) {
      throw InvalidModuleSpecifier(`Invalid specifier: ${target}`);
    }

    // 1.7 Return the URL resolution of resolvedTarget with every instance of "*" replaced with patternMatch.
    return new URL(target.replace("*", patternMatch), packageURL).toString();
  } else if (target && typeof target === "object") {
    // 2.1 If target contains any index property keys, as defined in ECMA-262 6.1.7 Array Index, throw an Invalid Package Configuration error.
    if (Object.getOwnPropertyNames(target).some(ECMA_262_6_1_7_ARRAY_INDEX)) {
      throw new InvalidPackageConfiguration(`Invalid package configuration: ${target}`);
    }

    // 2.2 For each property p of target, in object insertion order as
    // NOTE: Order is not guaranteed currently
    for (let key in target) {
      // 2.2.1 If p equals "default" or conditions contains an entry for p, then
      if (key === "default" || conditions.some((condition) => condition === key)) {
        let targetValue = target[key];
        let resolved = PACKAGE_TARGET_RESOLVE(packageURL, targetValue, patternMatch, isImports, conditions);
        if (!resolved) {
          continue;
        } else {
          return resolved;
        }
      }
    }
  } else if (Array.isArray(target)) {
    // 3.1 If _target.length is zero, return null. (NOTE: Unsure why _target is used instead of target)
    if (!target.length) return null;
    for (let targetValue of target) {
      let resolved;
      try {
        resolved = PACKAGE_TARGET_RESOLVE(packageURL, targetValue, patternMatch, isImports, conditions);
      } catch (err) {
        // 3.2.1 Let resolved be the result of PACKAGE_TARGET_RESOLVE( packageURL, targetValue, patternMatch, isImports, conditions), continuing the loop on any Invalid Package Target error.
        if (err instanceof InvalidPackageTarget) {
          continue;
        }
      }

      if (!resolved) {
        continue;
      } else {
        return resolved;
      }
    }

    // 3.3 Return or throw the last fallback resolution null return or error. (NOTE: Unsure about this part)
    return null;
  } else if (!target) {
    return null;
  } else {
    throw InvalidPackageTarget(`Invalid package target: ${target}`);
  }
}

function ECMA_262_6_1_7_ARRAY_INDEX(key) {
  const nonNegativeInteger = /^\d+$/;
  const MAX_SAFE_INDEX_INTEGER = 2 ** 32 - 2;

  return nonNegativeInteger.test(key) && Number(key) <= MAX_SAFE_INDEX_INTEGER;
}

function ESM_FILE_FORMAT(url) {
  // 1. Assert: url corresponds to an existing file.
  if (!fs.existsSync(url)) throw new Error("File does not exist");

  // 2. If url ends in ".mjs", return "module".
  if (url.endsWith(".mjs")) return "module";

  // 3. If url ends in ".cjs", return "commonjs".
  if (url.endsWith(".cjs")) return "commonjs";

  // 4. If url ends in ".json", return "json".
  if (url.endsWith(".json")) return "json";

  // 5. If --experimental-wasm-modules is enabled and url ends in ".wasm", then
  // TODO

  let packageURL = LOOKUP_PACKAGE_SCOPE(url);
  let pjson = READ_PACKAGE_JSON(packageURL);
  let packageType = null;

  // 9. If pjson?.type is "module" or "commonjs",
  // then set packageType to pjson.type.
  if (pjson?.type === "module" || pjson?.type === "commonjs") {
    packageType = pjson.type;
  }

  if (url.endsWith(".js")) {
    if (packageType) return packageType;
    // 10.2 If --experimental-detect-module is enabled and the result of DETECT_MODULE_SYNTAX(source) is true, then return "module"
    // TODO
    return "commonjs";
  }

  // 11. If url does not have any extension, then
  // NOTE: maybe we could check for valid extensions (.js, .mjs, .cjs, ...)
  if(!url.includes(".")) {
    // 11.1 If packageType is "module" and --experimental-wasm-modules is enabled and the file at url contains the header for a WebAssembly module, then return "wasm".
    // TODO

    if(packageType) return packageType;

    // 11.3 If --experimental-detect-module is enabled and the source of module contains static import or export syntax, then return "module".
    // TODO

    return "commonjs";
  }

  // 12. Return undefined (will throw during load phase).
  return;
}

function LOOKUP_PACKAGE_SCOPE(url) {
  let scopeURL = url;
  // 2. While scopeURL is not the file system root (unsure if the root is considered the protocol part)
  while (scopeURL !== "file://") {
    // 2.1 Set scopeURL to the parent URL of scopeURL.
    scopeURL = new URL("../", scopeURL).toString();

    // 2.2 If scopeURL ends in a "node_modules" path segment, return null.
    if (scopeURL.endsWith("node_modules")) return null;

    // 2.3 Let pjsonURL be the resolution of "package.json" within scopeURL.
    let pjsonURL = new URL("package.json", scopeURL).toString();

    // 2.4 If the file at pjsonURL exists, return scopeURL.
    if (fs.existsSync(pjsonURL)) return scopeURL;

    return null;
  }
}

function READ_PACKAGE_JSON(packageURL) {
  let pjsonURL = new URL("package.json", packageURL).toString();
  if (!fs.existsSync(pjsonURL)) return null;

  let parsed;
  try {
    let contents = fs.readFileSync(pjsonURL, "utf-8");
    parsed = JSON.parse(contents);
  } catch (_) {
    throw new InvalidPackageConfiguration(`Invalid package.json: ${pjsonURL}`);
  }

  return parsed;
}

function DETECT_MODULE_SYNTAX(source) {
  // 1. Parse source as an ECMAScript module.
  // 2. If the parse is successful, then
  // 2.1 If source contains top-level await, static import or export statements, or import.meta, return true.
  // 2.2 If source contains a top-level lexical declaration (const, let, or class) of any of the CommonJS wrapper variables (require, exports, module, __filename, or __dirname) then return true.
  // 3. Else return false.

  // TODO: Handle errors
  let ast = acorn.parse(source, { sourceType: "module", ecmaVersion: 2022 });

  // Detect ESM
  const hasTopLevelAwait = ast.body.some(
    (node) => node.type === "ExpressionStatement" && node.expression.type === "AwaitExpression"
  );
  const hasStaticImport = ast.body.some((node) => node.type === "ImportDeclaration");
  const hasExport = ast.body.some((node) => node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration");
  const hasImportMeta = ast.body.some(
    (node) => node.type === "MetaProperty" && node.meta.name === "import" && node.property.name === "meta"
  );

  if (hasTopLevelAwait || hasStaticImport || hasExport || hasImportMeta) return true;

  // Detect CJS
  // TODO
  return false;
}
