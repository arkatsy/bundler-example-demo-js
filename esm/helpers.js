/**
 * @param {string} specifier
 * @returns {boolean} Whether the specifier is a valid URL or not
 * @see {@link https://nodejs.org/docs/latest/api/esm.html#urls} Nodejs docs
 * @description Checks if the specifier is a valid URL or not
 */
function isValidURL(specifier) {
  const validProtocols = ["file:", "data:", "node:"];
  return validProtocols.some((v) => specifier.startsWith(v));
}

export { isValidURL };
