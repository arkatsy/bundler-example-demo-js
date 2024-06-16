import fs from "node:fs";
import module from "node:module";
import { includesAny, isValidURL } from "./helpers";
import {
  ModuleNotFound,
  InvalidModuleSpecifier,
  UnsupportedDirectoryImport,
  PackagePathNotExported,
  PackageImportNotDefined,
} from "./errors";

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
  return;
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
  return;
}

function ESM_FILE_FORMAT(url) {
  return;
}

function LOOKUP_PACKAGE_SCOPE(url) {
  return;
}

function READ_PACKAGE_JSON(packageURL) {
  return;
}

function DETECT_MODULE_SYNTAX(source) {
  return;
}
