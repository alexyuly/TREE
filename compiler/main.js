#!/usr/bin/env node

const fs = require("fs");
const readline = require("readline");

const [, , sourcePath] = process.argv;

const sourceInterface = readline.createInterface({
  input: fs.createReadStream(sourcePath)
});

sourceInterface.on("line", line => {
  console.log(line);
  // TODO: Compile lines.
});
