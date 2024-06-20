class InvalidModuleSpecifier extends Error {
  /**
   *
   * @param {string} [message]
   */
  constructor(message = "") {
    super(`Module specifier is an invalid URL, package name or package subpath specifier ${message}`);
    this.name = "InvalidModuleSpecifier";
  }
}

class PackageImportNotDefined extends Error {
  /**
   *
   * @param {string} [message]
   */
  constructor(message = "") {
    super(`Package imports do not define the specifier. ${message}`);
    this.name = "PackageImportNotDefined";
  }
}

class UnsupportedDirectoryImport extends Error {
  /**
   *
   * @param {string} [message]
   */
  constructor(message = "") {
    super(`The resolved path corresponds to a directory, which is not a supported target for module imports. ${message}`);
    this.name = "UnsupportedDirectoryImport";
  }
}

class ModuleNotFound extends Error {
  /**
   *
   * @param {string} [message]
   */
  constructor(message = "") {
    super(`The package or module requested does not exist. ${message}`);
    this.name = "ModuleNotFound";
  }
}

class PackagePathNotExported extends Error {
  /**
   *
   * @param {string} [message]
   */
  constructor(message = "") {
    super(`Package exports do not define or permit a target subpath in the package for the given module. ${message}`);
    this.name = "PackagePathNotExported";
  }
}

class InvalidPackageTarget extends Error {
  /**
   *
   * @param {string} [message]
   */
  constructor(message = "") {
    super(
      `Package exports or imports define a target module for the package that is an invalid type or string target. ${message}`
    );
    this.name = "InvalidPackageTarget";
  }
}

class InvalidPackageConfiguration extends Error {
  /**
   *
   * @param {string} [message]
   */
  constructor(message = "") {
    super(`package.json configuration is invalid or contains an invalid configuration. ${message}`);
    this.name = "InvalidPackageConfiguration";
  }
}

export {
  InvalidModuleSpecifier,
  UnsupportedDirectoryImport,
  ModuleNotFound,
  PackageImportNotDefined,
  PackagePathNotExported,
  InvalidPackageTarget,
  InvalidPackageConfiguration,
};
