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

export {
  InvalidModuleSpecifier,
  UnsupportedDirectoryImport,
  ModuleNotFound,
  PackageImportNotDefined,
  PackagePathNotExported,
  InvalidPackageTarget,
  InvalidPackageConfiguration,
};
