import url from "node:url";
import fs, { lstatSync } from "node:fs";
import module from "node:module"

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
  } else if (["/", "./", "../"].some((v) => specifier.startsWith(v))) {
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
    if(["%2F", "%5C"].some((v) => resolved.includes(v))) {
      // 7.1 If resolved contains any percent encodings of "/" or "\" ("%2F" and "%5C" respectively), 
      // then throw an Invalid Module Specifier error.
      throw new InvalidModuleSpecifier(`Found %2F or %5C in resolved URL: ${resolved}`);
    }
    
    if (fs.existsSync(resolved) && lstatSync(resolved).isDirectory()) {
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

  if(!packageSpecifier.length) {
    // 2.1 Throw an Invalid Module Specifier error.
    throw new InvalidModuleSpecifier("Empty package specifier");
  }
  if(module.isBuiltin(packageSpecifier)) {
    // 3.1 Return the string "node:" concatenated with packageSpecifier.
    return `node:${packageSpecifier}`;
  }
  if(!packageSpecifier.startsWith("@")) {
    // 4.1 Set packageName to the substring of packageSpecifier until the first "/" separator or the end of the string.
    packageName = packageSpecifier.split("/")[0];
  }
}

console.log(ESM_RESOLVE("./test/entry.js", "file:///home/arkatsy/dev/bundler-example-demo-js/"));

