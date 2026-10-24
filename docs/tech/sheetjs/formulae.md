> Copied as text from https://docs.sheetjs.com/docs/csf/features/formulae on 2026-10-22. Only the visible tab of each tabbed code block came across.

SheetJS Data ModelSpreadsheet FeaturesFormulae
Formulae
File Format Support (click to show)

SheetJS supports reading and writing formulae for a number of file formats. When supported, formulae will always be exported.

The "A1-Style" formula string is stored in the f field of the cell object. The SheetJS formula string closely matches the text representation in spreadsheet file formats.

SheetJS formula strings do not always match Excel or other spreadsheets!

Spreadsheet software typically represent formulae with a leading = sign, but SheetJS formulae omit the =.

Spreadsheet software localize formulae, but SheetJS formulae always use the en-US form.

Spreadsheet software may display formulae in RC notation, but SheetJS formulae always use A1-Style.

Spreadsheet software will hide prefixes. SheetJS parsers provide options to replicate that behavior.

When building new exports, it is strongly recommended to create a sample file in Excel, parse with the SheetJS library, and inspect the formula string.

Live Demo​

This test file includes a formula in cell D1:

The following code block fetches the file, parses and prints info on cell D1:

RESULT
Loading...
LIVE EDITOR
/* The live editor requires this function wrapper */
function InspectCellFormula(props) {
  const [ws, setWS] = React.useState({"!ref":"A1"});
  const [addr, setAddr] = React.useState("D1");
  const setaddr = React.useCallback((evt)=>{ setAddr(evt.target.value) });

  /* Process ArrayBuffer */
  const process_ab = (ab) => {
    const wb = XLSX.read(ab, {cellFormula: true, sheetStubs: true, xlfn: true});
    setWS(wb.Sheets[wb.SheetNames[0]]);
  };

  /* Fetch sample file */
  React.useEffect(() => {(async() => {
    process_ab(await (await fetch("/files/concat.xlsx")).arrayBuffer());
  })(); }, []);
  const process_file = async(e) => {
    process_ab(await e.target.files[0].arrayBuffer());
  };
  return ( <>
    <b>Select a file to inspect cell formulae</b><br/>
    <input type="file" onChange={process_file}/><br/><br/>
    <b>Cell: </b><input type="text" value={addr} onChange={setaddr} size="6"/>
    {!ws[addr] ? ( <b>Cell {addr} not found</b> ) : ( <table>
      <tr><td>Formula</td><td><code>{ws[addr].f}</code></td></tr>
      <tr><td>Value</td><td><code>{ws[addr].v}</code></td></tr>
      <tr><td>Cell Type</td><td><code>{ws[addr].t}</code></td></tr>
    </table> )}
  </> );
}

Storage​
Single-Cell Formulae​

For simple formulae, the f key of the desired cell can be set to the actual formula text. This worksheet represents A1=1, A2=2, and A3=A1+A2:

var worksheet = {
  "!ref": "A1:A3", // Worksheet range A1:A3
  A1: { t: "n", v: 1 }, // A1 is a number (1)
  A2: { t: "n", v: 2 }, // A2 is a number (2)
  A3: { t: "n", v: 3, f: "A1+A2" } // A3 =A1+A2
};


Utilities like aoa_to_sheet will accept cell objects in lieu of values:

var worksheet = XLSX.utils.aoa_to_sheet([
  [ 1 ], // A1
  [ 2 ], // A2
  [ {t: "n", v: 3, f: "A1+A2"} ] // A3
]);

Live Example (click to hide)

This demo creates a worksheet where A1=1, A2=2, and A3=A1+A2.

RESULT
Loading...
LIVE EDITOR
/* The live editor requires this function wrapper */
function ExportSimpleFormula(props) {

  /* Callback invoked when the button is clicked */
  const xport = React.useCallback(() => {
    /* Create worksheet with A1=1, A2=2, A3=A1+A2 */
    var ws = XLSX.utils.aoa_to_sheet([
      [ 1 ], // A1
      [ 2 ], // A2
      [ {t: "n", v: 3, f: "A1+A2"} ] // A3
    ]);

    /* Export to file (start a download) */
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "SheetJSFormula1.xlsx");
  });

  return (<button onClick={xport}><b>Export XLSX!</b></button>);
}


Cells with formula entries but no value will be serialized in a way that Excel and other spreadsheet tools will recognize. This library will not automatically compute formula results! For example, the following worksheet will include the BESSELJ function but the result will not be available in JavaScript:

var worksheet = XLSX.utils.aoa_to_sheet([
  [ 3.14159, 2 ], // Row "1"
  [ { t: "n", f: "BESSELJ(A1,B1)" } ] // Row "2" will be calculated on file open
])


If the actual results are needed in JS, SheetJS Pro offers a formula calculator component for evaluating expressions, updating values and dependent cells, and refreshing entire workbooks.

Array Formulae​

Assign an array formula

XLSX.utils.sheet_set_array_formula(worksheet, range, formula);


Array formulae are stored in the top-left cell of the array block. All cells of an array formula have a F field corresponding to the range. A single-cell formula can be distinguished from a plain formula by the presence of F field.

The following snippet sets cell C1 to the array formula {=SUM(A1:A3*B1:B3)}:

// API function
XLSX.utils.sheet_set_array_formula(worksheet, "C1", "SUM(A1:A3*B1:B3)");

// ... OR raw operations
worksheet["C1"] = { t: "n", f: "SUM(A1:A3*B1:B3)", F: "C1:C1" };


For a multi-cell array formula, every cell has the same array range but only the first cell specifies the formula. Consider D1:D3=A1:A3*B1:B3:

// API function
XLSX.utils.sheet_set_array_formula(worksheet, "D1:D3", "A1:A3*B1:B3");

// ... OR raw operations
worksheet["D1"] = { t: "n", F: "D1:D3", f: "A1:A3*B1:B3" };
worksheet["D2"] = { t: "n", F: "D1:D3" };
worksheet["D3"] = { t: "n", F: "D1:D3" };


Utilities and writers are expected to check for the presence of a F field and ignore any possible formula element f in cells other than the starting cell. They are not expected to perform validation of the formulae!

Live Example (click to show)
Dynamic Array Formulae​

Assign a dynamic array formula

XLSX.utils.sheet_set_array_formula(worksheet, range, formula, true);


Dynamic Array Formulae are supported in the XLSX/XLSM and XLSB file formats. They are internally stored as normal array formulae but have special cell metadata indicating that the formula should be allowed to adjust the range.

An array formula can be marked as dynamic by setting the cell D property to true. The F range is expected but can be the set to the current cell:

// API function
XLSX.utils.sheet_set_array_formula(worksheet, "C1", "_xlfn.UNIQUE(A1:A3)", 1);

// ... OR raw operations
worksheet["C1"] = { t: "s", f: "_xlfn.UNIQUE(A1:A3)", F:"C1", D: 1 }; // dynamic

Live Example (click to show)
Functions​
Reading Files​

read and readFile accept an options argument. The cellFormula option should be set to true to expose cell formulae:

Browser
NodeJS
Bun
Deno

Typically file data will be available as an ArrayBuffer, either downloaded with fetch / XMLHttpRequest or user-submitted with a File Input element. cellFormula: true should be added to the second options argument:

/* using read in the browser, `cellFormula` is in the second argument */
const ab = await (await fetch("test.xlsx")).arrayBuffer();
const workbook = XLSX.read(ab, { cellFormula: true });
// ------------------------------^^^^^^^^^^^^^^^^^

Localization​

Excel and other spreadsheet software will display different formula strings in different countries and locales.

SheetJS parsers and writers do not attempt locale-specific changes.

For example, the Spanish Excel formula =CONTAR(A1:C3;B4:D6) is equivalent to the SheetJS formula string COUNT(A1:A3,B4:D6) .

Grammar​

SheetJS formula function arguments are always separated with commas (,).

SheetJS	en-US Excel	es-ES Excel
ATAN2(1,1)	=ATAN2(1,1)	=ATAN2(1;1)
Function Names​

Excel stores formula expressions using the English (United States) function names. For non-English users, Excel uses a localized set of function names.

For example, when the computer language and region is set to Spanish, Excel interprets =CONTAR(A1:C3) as if CONTAR is the COUNT function. However, in the actual file, Excel stores COUNT(A1:C3).

JSON Translation table.

Function Name Translator (click to hide)
RESULT
Loading...
LIVE EDITOR
/* The live editor requires this function wrapper */
function Translator(props) {
  const [locales, setLocales] = React.useState([]);
  const [data, setData] = React.useState({});
  const [names, setNames] = React.useState([]);
  const [name, setName] = React.useState("Enter a function name");
  /* Fetch and display formula */
  React.useEffect(() => { (async() => {
    /* Fetch data */
    const json = await (await fetch("/fmla/table.json")).json();
    setLocales(Object.keys(json));
    setData(json);
    setNames(json.en);
    setName(json.es[0])
  })(); }, []);

  const update_name = React.useCallback(() => {
    const nameelt = document.getElementById("fmla");
    const idx = nameelt.options[nameelt.selectedIndex].value;
    const toelt = document.getElementById("tolocale");
    const tovalue = toelt.options[toelt.selectedIndex].value;
    setName(data[tovalue][idx]);
  });

  const update_from = React.useCallback(() => {
    const fromelt = document.getElementById("fromlocale");
    const fromvalue = fromelt.options[fromelt.selectedIndex].value;
    setNames(data[fromvalue]);
  });

  return ( <>
    <b>Name: </b><select id="fmla" onChange={update_name}>
    {names.map((n, idx) => (<option value={idx}>{n}</option>))}
    </select><br/>
    <b>From: </b><select id="fromlocale" onChange={update_from}>
    {locales.map(l => (<option value={l} selected={l=="en"}>{l}</option>))}
    </select>
    <b> To: </b><select id="tolocale" onChange={update_name}>
    {locales.map(l => (<option value={l} selected={l=="es"}>{l}</option>))}
    </select><br/>
    <b> Translation: </b><pre id="out">{name}</pre>
  </> );
}

Prefixed "Future Functions"​

Functions introduced in newer versions of Excel are prefixed with _xlfn. when stored in files. When writing formula expressions using these functions, the prefix is required for maximal compatibility:

// Broadest compatibility
XLSX.utils.sheet_set_array_formula(worksheet, "C1", "_xlfn.UNIQUE(A1:A3)", 1);

// Can cause errors in spreadsheet software
XLSX.utils.sheet_set_array_formula(worksheet, "C1", "UNIQUE(A1:A3)", 1);


When reading a file, the xlfn option preserves the prefixes.

Functions requiring _xlfn. prefix (click to show)
Caveats​

In some cases, seemingly valid formulae may be rejected by spreadsheet software.

EVALUATE is a supported function in WPS Office. It is not valid in a cell formula in Excel. It can be used in an Excel defined name when exporting to XLSM format but not XLSX. This is a limitation of Excel. Since WPS Office accepts files with EVALUATE, the writer does not warn or throw errors.

Edit this page
Last updated on Aug 3, 2026
