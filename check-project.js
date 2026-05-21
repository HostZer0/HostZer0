const fs = require("fs");
const path = require("path");

const root = process.cwd();

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function readIfExists(file) {
  const fullPath = path.join(root, file);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

function listFiles(dir = root) {
  const ignored = new Set(["node_modules", ".git", ".netlify"]);
  const out = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(fullPath));
    else out.push(fullPath);
  }

  return out;
}

function hasPattern(files, pattern) {
  return files.some((file) => pattern.test(fs.readFileSync(file, "utf8")));
}

const files = listFiles();
const jsAndHtml = files.filter((file) => /\.(html|js)$/i.test(file));
const companyStoragePattern = /(localStorage|sessionStorage)[\s\S]{0,180}(empresa|empresas)|(?:empresa|empresas)[\s\S]{0,180}(localStorage|sessionStorage)/i;

const checks = [
  ["index.html ou package.json", exists("index.html") || exists("package.json")],
  ["netlify.toml", exists("netlify.toml")],
  ["chamadas fetch", hasPattern(jsAndHtml, /\bfetch\s*\(/)],
  ["localStorage/sessionStorage relacionado a empresas", hasPattern(jsAndHtml, companyStoragePattern)],
  ["configuracao da URL da API", hasPattern(jsAndHtml, /API_URL|CONTAD_API_URL|VITE_API_URL|script\.google\.com/)],
  ["listarEmpresas()", hasPattern(jsAndHtml, /listarEmpresas\s*\(/)],
  ["cadastrarEmpresa()", hasPattern(jsAndHtml, /cadastrarEmpresa\s*\(/)],
  ["editarEmpresa()", hasPattern(jsAndHtml, /editarEmpresa\s*\(/)],
  ["excluirEmpresa()", hasPattern(jsAndHtml, /excluirEmpresa\s*\(/)],
];

let failed = 0;

console.log("CONTAD project check\n");

for (const [label, ok] of checks) {
  console.log(`${ok ? "OK " : "ERR"} ${label}`);
  if (!ok) failed += 1;
}

const packageJson = readIfExists("package.json");
if (packageJson) {
  const pkg = JSON.parse(packageJson);
  const hasCheck = pkg.scripts && pkg.scripts.check === "node scripts/check-project.js";
  console.log(`${hasCheck ? "OK " : "ERR"} package.json scripts.check`);
  if (!hasCheck) failed += 1;
}

if (failed) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log("\nAll checks passed.");
