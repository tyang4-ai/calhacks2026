> Copied as text from https://docs.sheetjs.com/docs/getting-started/installation/frameworks on 2026-10-22. Only the visible tab of each tabbed code block came across.

Getting StartedInstallationFrameworks and Bundlers
Frameworks and Bundlers

Each standalone release package is available at https://cdn.sheetjs.com/. The NodeJS package is designed to be used with frameworks and bundlers. It is a proper ECMAScript Module release which can be optimized with developer tools.

https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz is the URL for version 0.20.3

Installation​

Tarballs can be directly installed using a package manager:

npm
pnpm
Yarn
yarn remove xlsx
yarn add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz


Newer releases of Yarn may throw an error:

Usage Error: It seems you are trying to add a package using a https:... url; we now require package names to be explicitly specified.
Try running the command again with the package name prefixed: yarn add my-package@https:...


The workaround is to prepend the URL with xlsx@:

yarn add xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz


Once installed, the library can be imported under the name xlsx:

import { read, writeFileXLSX } from "xlsx";


The "Bundlers" demo includes complete examples.

Watch the repo or subscribe to the RSS feed to be notified when new versions are released!

SNYK BUGS

Snyk security tooling may report errors involving "Prototype Pollution":

Prototype Pollution [Medium Severity][https://security.snyk.io/vuln/SNYK-JS-XLSX-5457926]


As noted in the Snyk report:

The issue is resolved in version 0.19.3

Snyk is falsely reporting vulnerabilities. It is a bug in the Snyk tooling.

Until Snyk fixes the bugs, the official recommendation is to suppress the warning.

Legacy Endpoints​

Older releases are technically available on the public npm registry as xlsx, but the registry is out of date. The latest version on that registry is 0.18.5

This is a known registry bug

The SheetJS CDN https://cdn.sheetjs.com/ is the authoritative source for SheetJS modules.

For existing projects, the easiest approach is to uninstall and reinstall:

npm
pnpm
Yarn
yarn remove xlsx
yarn add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz


When the xlsx library is a dependency of a dependency, the overrides field in package.json can control module resolution:

package.json
{

  "overrides": {

    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"

  }

}

Vendoring​

For general stability, making a local copy of SheetJS modules ("vendoring") is strongly recommended. Vendoring decouples projects from SheetJS infrastructure.

Remove any existing dependency on a project named xlsx:
npm
pnpm
Yarn
yarn remove xlsx


Download the tarball (xlsx-0.20.3.tgz) for the desired version. The current version is available at https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz

curl -O https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz

Create a vendor subfolder at the root of your project:
mkdir -p vendor

Move the tarball from step (1) to the vendor folder:
mv xlsx-0.20.3.tgz vendor

If the project is managed with a version control system, add the tarball to the source repository. The Git VCS supports the add subcommand:
git add vendor/xlsx-0.20.3.tgz

Install the tarball using a package manager:
npm
pnpm
Yarn
yarn add file:vendor/xlsx-0.20.3.tgz


Newer releases of Yarn may throw an error:

Usage Error: The file:vendor/xlsx-0.20.3.tgz string didn't match the required format (package-name@range). Did you perhaps forget to explicitly reference the package name?


The workaround is to prepend the URI with xlsx@:

yarn add xlsx@file:vendor/xlsx-0.20.3.tgz


The package will be installed and accessible as xlsx.

Usage​

With most frameworks and bundler tools, named imports are recommended:

import { read, utils } from 'xlsx';


Some legacy bundlers require the glob import:

import * as XLSX from 'xlsx';
const { read, utils } = XLSX;


For legacy bundlers that support CommonJS, require will work:

var XLSX = require("xlsx");
var read = XLSX.read, utils = XLSX.utils;


The "Bundlers" demo includes complete examples.

Dynamic Imports​

Dynamic imports with import() will only download scripts when they are needed.

Dynamic import will always download the full contents of the imported scripts!

This is a design flaw in ECMAScript modules

It is strongly recommended to use a wrapper script that imports and re-exports the parts of the SheetJS library that are used in a specific function or page:

SheetJSWriteWrapper.js (wrapper script)
/* This wrapper pulls `writeFileXLSX` and `utils` from the SheetJS library */
import { utils, writeFileXLSX } from "xlsx";
export { utils, writeFileXLSX };


Bundlers will typically optimize the script and only add the requested features. A dynamic import of the wrapper will load the optimized wrapper script:

async function export_data() {
  /* dynamically import the SheetJS Wrapper */

  const XLSX = await import ("./SheetJSWriteWrapper");

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([["a","b","c"],[1,2,3]]);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFileXLSX(wb, "SheetJSDynamicWrapperTest.xlsx");
}

Encoding support​

If Encoding support is required, cpexcel.full.mjs must be manually imported:

/* load the codepage support library for extended support with older formats  */
import { set_cptable } from "xlsx";
import * as cptable from 'xlsx/dist/cpexcel.full.mjs';
set_cptable(cptable);

Edit this page
Last updated on Aug 3, 2026
