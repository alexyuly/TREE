import * as fs from "fs";
import vmJs from "./vm-node/main";

const [, , path] = process.argv;
const spec = JSON.parse(fs.readFileSync(path, "utf8"));
vmJs(spec);
