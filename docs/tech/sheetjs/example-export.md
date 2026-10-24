> Copied as text from https://docs.sheetjs.com/docs/getting-started/examples/export on 2026-10-22. Only the visible tab of each tabbed code block came across.

Getting StartedTutorialsExport Tutorial
Export Tutorial

Many modern data sources provide an API to download data in JSON format. Many users prefer to work in spreadsheet software. SheetJS libraries help bridge the gap by translating programmer-friendly JSON to user-friendly workbooks.

The goal of this example is to generate a XLSX workbook of US President names and birthdates. We will download and wrangle a JSON dataset using standard JavaScript functions. Once we have a simple list of names and birthdates, we will use SheetJS API functions to build a workbook object and export to XLSX.

The "Live Demo" section includes a working demo in this page! "Run the Demo Locally" shows how to run the workflow in iOS / Android apps, desktop apps, NodeJS scripts and other environments.

The following sequence diagram shows the process:

Acquire Data​

The raw data is available in JSON form1. It has been mirrored at https://docs.sheetjs.com/executive.json

Raw Data​

Acquiring the data is straightforward with fetch:

const url = "https://docs.sheetjs.com/executive.json";
const raw_data = await (await fetch(url)).json();

Code Explanation (click to show)

The raw data is an Array of objects2. For this discussion, the relevant data for John Adams is shown below:

{
  "name": {
    "first": "John",          // <-- first name
    "last": "Adams"           // <-- last name
  },
  "bio": {
    "birthday": "1735-10-19", // <-- birthday
  },
  "terms": [                  // <-- array of presidential terms
    { "type": "viceprez", "start": "1789-04-21", },
    { "type": "viceprez", "start": "1793-03-04", },
    { "type": "prez",     "start": "1797-03-04", } // <-- presidential term
  ]
}

Filtering for Presidents​

The dataset includes Aaron Burr, a Vice President who was never President!

The terms field of each object is an array of terms. A term is a Presidential term if the type property is "prez". We are interested in Presidents that served at least one term. The following line creates an array of Presidents:

const prez = raw_data.filter(row => row.terms.some(term => term.type === "prez"));


JavaScript code can be extremely concise. The "Code Explanation" blocks explain the code in more detail.

Code Explanation (click to show)
Sorting by First Term​

The dataset is sorted in chronological order by the first presidential or vice presidential term. The Vice President and President in a given term are sorted alphabetically.

Barack Obama became President and Joseph Biden became Vice President in 2009. Since "Biden" is alphabetically before "Obama", Biden's data appears first.

The goal is to sort the presidents in order of their initial presidential term.

The first step is adding the first presidential term start date to the dataset. The following code looks at each president and creates a start property that represents the start of the first presidential term.

prez.forEach(row => row.start = row.terms.find(term => term.type === "prez").start);

Code Explanation (click to show)

At this point, each row in the prez array has a start property. Since the start properties are strings, the following line sorts the array:

prez.sort((l,r) => l.start.localeCompare(r.start));

Code Explanation (click to show)
Reshaping the Array​

For this example, the name will be the first name combined with the last name (row.name.first + " " + row.name.last) and the birthday will be available at row.bio.birthday. Using Array#map, the dataset can be massaged in one call:

const rows = prez.map(row => ({
  name: row.name.first + " " + row.name.last,
  birthday: row.bio.birthday
}));

Code Explanation (click to show)

The result is an array of "simple" objects with no nesting:

[
  { name: "George Washington", birthday: "1732-02-22" },
  { name: "John Adams", birthday: "1735-10-19" },
  // ... one row per President
]

Create a Workbook​

The json_to_sheet method can generate a SheetJS worksheet from the cleaned dataset:

const worksheet = XLSX.utils.json_to_sheet(rows);


XLSX.utils.book_new creates a new workbook and XLSX.utils.book_append_sheet appends a worksheet to the workbook. The new worksheet will be called "Dates":

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Dates");

Clean up Workbook​

The data is in the workbook and can be exported.

There are multiple opportunities for improvement: the headers can be renamed and the column widths can be adjusted.

SheetJS Pro offers additional styling options like cell styling and frozen rows.

Changing Header Names (click to show)
Changing Column Widths (click to show)

After cleanup, the generated workbook looks like the screenshot below:

Export a File​

XLSX.writeFile creates a spreadsheet file and tries to write it to the system. In the browser, it will try to prompt the user to download the file. In NodeJS, it will write to the local directory.

XLSX.writeFile(workbook, "Presidents.xlsx", { compression: true });

Live Demo​

This demo runs in the web browser! Click "Click to Generate File!" and the browser should try to create Presidents.xlsx

RESULT
Loading...
LIVE EDITOR
function Presidents() { return ( <button onClick={async () => {
  /* fetch JSON data and parse */
  const url = "https://docs.sheetjs.com/executive.json";
  const raw_data = await (await fetch(url)).json();

  /* filter for the Presidents */
  const prez = raw_data.filter(row => row.terms.some(term => term.type === "prez"));

  /* sort by first presidential term */
  prez.forEach(row => row.start = row.terms.find(term => term.type === "prez").start);
  prez.sort((l,r) => l.start.localeCompare(r.start));

  /* flatten objects */
  const rows = prez.map(row => ({
    name: row.name.first + " " + row.name.last,
    birthday: row.bio.birthday
  }));

  /* generate worksheet and workbook */
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dates");

  /* fix headers */
  XLSX.utils.sheet_add_aoa(worksheet, [["Name", "Birthday"]], { origin: "A1" });

  /* calculate column width */
  const max_width = rows.reduce((w, r) => Math.max(w, r.name.length), 10);
  worksheet["!cols"] = [ { wch: max_width } ];

  /* create an XLSX file and try to save to Presidents.xlsx */
  XLSX.writeFile(workbook, "Presidents.xlsx", { compression: true });
}}><b>Click to Generate file!</b></button> ); }


https://sheetjs.com/pres.html is a hosted version of this demo.

Run the Demo Locally​
Web Browser
Command-Line (NodeJS)
Desktop App
Mobile App

Save the following script to SheetJSStandaloneDemo.html:

SheetJSStandaloneDemo.html
<body>
<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
<script>
(async() => {
  /* fetch JSON data and parse */
  const url = "https://docs.sheetjs.com/executive.json";
  const raw_data = await (await fetch(url)).json();

  /* filter for the Presidents */
  const prez = raw_data.filter(row => row.terms.some(term => term.type === "prez"));

  /* sort by first presidential term */
  prez.forEach(row => row.start = row.terms.find(term => term.type === "prez").start);
  prez.sort((l,r) => l.start.localeCompare(r.start));

  /* flatten objects */
  const rows = prez.map(row => ({
    name: row.name.first + " " + row.name.last,
    birthday: row.bio.birthday
  }));

  /* generate worksheet and workbook */
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dates");

  /* fix headers */
  XLSX.utils.sheet_add_aoa(worksheet, [["Name", "Birthday"]], { origin: "A1" });

  /* calculate column width */
  const max_width = rows.reduce((w, r) => Math.max(w, r.name.length), 10);
  worksheet["!cols"] = [ { wch: max_width } ];

  /* create an XLSX file and try to save to Presidents.xlsx */
  XLSX.writeFile(workbook, "Presidents.xlsx", { compression: true });
})();
</script>
</body>


After saving the file, run a local web server in the folder with the HTML file. For example, if NodeJS is installed:

npx -y http-server .


The server process will display a URL (typically http://127.0.0.1:8080). Open http://127.0.0.1:8080/SheetJSStandaloneDemo.html in your browser.

Footnotes​

https://theunitedstates.io/congress-legislators/executive.json is the original location of the example dataset. The contributors to the dataset dedicated the content to the public domain. When this demo was last tested, ↩

See "The Executive Branch" in the dataset documentation. ↩

Edit this page
Last updated on Aug 3, 2026
