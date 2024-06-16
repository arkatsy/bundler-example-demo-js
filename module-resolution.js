import url from "node:url";
import fs, { lstatSync } from "node:fs";
// Nodejs specs: https://nodejs.org/docs/latest/api/esm.html#resolution-and-loading-algorithm

// TODO: Move the errors elsewhere
class InvalidModuleSpecifier extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidModuleSpecifier";
  }
}

class UnsupportedDirectoryImport extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsupportedDirectoryImport";
  }
}

class ModuleNotFound extends Error {
  constructor(message) {
    super(message);
    this.name = "ModuleNotFound";
  }
}

class PackageImportNotDefined extends Error {
  constructor(message) {
    super(message);
    this.name = "PackageImportNotDefined";
  }
}

class PackagePathNotExported extends Error {
  constructor(message) {
    super(message);
    this.name = "PackagePathNotExported";
  }
}

class InvalidPackageTarget extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidPackageTarget";
  }
}

class InvalidPackageConfiguration extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidPackageConfiguration";
  }
}

/**
 * @param {string} specifier
 * @returns {boolean} Whether the specifier is a valid URL or not
 * @see {@link https://nodejs.org/docs/latest/api/esm.html#urls} Nodejs docs
 * @description Check if the specifier is a valid URL or not
 */
function isValidURL(specifier) {
  const validProtocols = ["file:", "data:", "node:"];
  return validProtocols.some((v) => specifier.startsWith(v));
}


/**
 *
 * @param {string} specifier
 * @param {string} parentURL
 */
function ESM_RESOLVE(specifier, parentURL) {
  let resolved;
  if (isValidURL(specifier)) {
    resolved = new URL(specifier, parentURL).toString();
  } else if (["/", "./", "../"].some((v) => specifier.startsWith(v))) {
    resolved = new URL(specifier, parentURL).toString();
  } else if (specifier.startsWith("#")) {
    resolved = PACKAGE_IMPORTS_RESOLVE(specifier, parentURL, defaultConditions);
  } else {
    // `specifier` is a bare specifier
    resolved = PACKAGE_RESOLVE(specifier, parentURL);
  }

  let format;
  if (resolved.startsWith("file:")) {
    if (resolved.includes("%2F") || resolved.includes("%5C")) {
      throw new InvalidModuleSpecifier(`Found %2F or %5C in resolved URL: ${resolved}`);
    } else if (fs.existsSync(resolved) && lstatSync(resolved).isDirectory()) {
      throw new UnsupportedDirectoryImport(`Directory imports are not supported: ${resolved}`);
    } else if (!fs.existsSync(resolved)) {
      throw new ModuleNotFound(`Module not found: ${resolved}`);
    }

    // NOTE: this needs testing on Windows
    resolved = fs.realpathSync(resolved);

    format = ESM_FILE_FORMAT(resolved);
  } else {
    // 8.1 Set format the module format of the content type associated with the URL resolved.
    // NOTE: unsure whether this is what the spec means
    format = new URL(resolved).protocol.slice(0, -1);
  }

  return { resolved, format };
}

function PACKAGE_RESOLVE(specifier, parentURL) {
  return;
}

// console.log(ESM_RESOLVE("./test/entry.js", "file:///home/arkatsy/dev/bundler-example-demo-js/"));

