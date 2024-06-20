import {
  DETECT_MODULE_SYNTAX,
  ECMA_262_6_1_7_ARRAY_INDEX,
  ESM_FILE_FORMAT,
  LOOKUP_PACKAGE_SCOPE,
  PACKAGE_EXPORTS_RESOLVE,
  PACKAGE_IMPORTS_EXPORTS_RESOLVE,
  PACKAGE_IMPORTS_RESOLVE,
  PACKAGE_RESOLVE,
  PACKAGE_SELF_RESOLVE,
  PACKAGE_TARGET_RESOLVE,
  PATTERN_KEY_COMPARE,
  READ_PACKAGE_JSON,
  ESM_RESOLVE,
} from "./resolution.js";
import { deepStrictEqual, strictEqual, throws } from "node:assert";
import { describe, it, mock, afterEach } from "node:test";
import { InvalidPackageConfiguration } from "./errors.js";
import fs from "node:fs";

describe(ECMA_262_6_1_7_ARRAY_INDEX.name, () => {
  it("should return false for NaN", () => {
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(NaN), false);
  });

  it("should return false for Infinity values", () => {
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(-Infinity), false);
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(+Infinity), false);
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(Infinity), false);
  });

  it("should return false for float numbers", () => {
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(Math.random()), false);
  });

  it("should return false for negative numbers", () => {
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(-1), false);
  });

  it("should return false for integers that are not inside the array indices range", () => {
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(-1), false);
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(2 ** 32), false);
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(-0), false);
  });

  it("should return true integers that are in the array indices range", () => {
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(2 ** 32 - 2), true);
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(0), true);
    strictEqual(ECMA_262_6_1_7_ARRAY_INDEX(+0), true);
  });
});

describe(READ_PACKAGE_JSON.name, () => {
  let _existsSync = fs.existsSync;
  let _readFileSync = fs.readFileSync;
  afterEach(() => {
    fs.existsSync = _existsSync;
    fs.readFileSync = _readFileSync;
  });

  it("should return null if the package URL can't be resolved", () => {
    const existsSync = mock.fn(() => false);
    fs.existsSync = existsSync;

    strictEqual(READ_PACKAGE_JSON("file:///home/user/project/"), null);
  });

  it("should throw InvalidPackageConfiguration error for invalid json inside the package.json", () => {
    const existsSync = mock.fn(() => true);
    const invalidPackageJSON = `{"name": "package1", "version": "1.0.1}`; // missing closing quote
    const readFileSync = mock.fn(() => invalidPackageJSON);
    fs.existsSync = existsSync;
    fs.readFileSync = readFileSync;

    throws(() => READ_PACKAGE_JSON("file:///home/user/project/"), InvalidPackageConfiguration);
  });

  it("should throw InvalidPackageConfiguration error when the package.json file can't be read", () => {
    const existsSync = mock.fn(() => true);
    const readFileSync = mock.fn(() => { throw new Error() }); // prettier-ignore
    fs.existsSync = existsSync;
    fs.readFileSync = readFileSync;

    throws(() => READ_PACKAGE_JSON("file:///home/user/project/"), InvalidPackageConfiguration);
  });

  it("should return the parsed package.json content when the file exists and can be read", () => {
    const existsSync = mock.fn(() => true);
    const packageJSON = { name: "package", version: "1.0.1" };
    const readFileSync = mock.fn(() => JSON.stringify(packageJSON));
    fs.existsSync = existsSync;
    fs.readFileSync = readFileSync;

    deepStrictEqual(READ_PACKAGE_JSON("file:///home/user/project/"), packageJSON);
  });
});

describe(LOOKUP_PACKAGE_SCOPE.name, () => {
  it(`TODO`, (t) => t.skip());
});

describe(ESM_FILE_FORMAT.name, () => {
  it(`TODO`, (t) => t.skip());
});

describe(PACKAGE_TARGET_RESOLVE.name, () => {
  it(`TODO`, (t) => t.skip());
});

describe(PATTERN_KEY_COMPARE.name, () => {
  it(`TODO`, (t) => t.skip());
});

describe(PACKAGE_IMPORTS_EXPORTS_RESOLVE.name, () => {
  it(`TODO`, (t) => t.skip());
});

describe(PACKAGE_IMPORTS_RESOLVE.name, () => {
  it(`TODO`, (t) => t.skip());
});

describe(PACKAGE_EXPORTS_RESOLVE.name, () => {
  it(`TODO`, (t) => t.skip());
});

describe(PACKAGE_SELF_RESOLVE.name, () => {
  it(`TODO`, (t) => t.skip());
});

describe(DETECT_MODULE_SYNTAX.name, () => {
  it(`TODO`, (t) => t.skip());
});

describe(PACKAGE_RESOLVE.name, () => {
  it(`TODO`, (t) => t.skip());
});

describe(ESM_RESOLVE.name, () => {
  it(`TODO`, (t) => t.skip());
});