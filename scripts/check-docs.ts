import { readdirSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { latestVersion } from "../constants/latestVersion";

// Run against the released compiler, with its matching Rust/clang build toolchain.
const compiler = resolve(process.argv[2] ?? process.env.SOPLANG_BIN ?? "../soplang/target/release/soplang");
const version = spawnSync(compiler, ["--version"], { encoding: "utf8" });
const expectedVersion = `soplang ${latestVersion.replace(/^v/, "")}`;
if (version.status !== 0 || version.stdout.trim() !== expectedVersion) {
  throw new Error(`Expected ${expectedVersion}; provide the matching released compiler path.`);
}
type Example = { page: string; title: string; code: string };
const examples: Example[] = [];
for (const file of readdirSync("content/docs").filter((name) => name.endsWith(".mdx")).sort()) {
  const source = readFileSync(join("content/docs", file), "utf8");
  const before = examples.length;
  for (const match of source.matchAll(/<SoplangCodeWindow\s+title="([^"]+)"\s+code=\{(`(?:\\.|[^`])*`)\}\s*\/>/g)) {
    if (match[2].includes("${")) throw new Error(`Dynamic template in ${file}/${match[1]}`);
    // These are trusted repository literals. Evaluating the literal matches MDX's JS escaping.
    examples.push({ page: file, title: match[1], code: new Function(`return ${match[2]}`)() });
  }
  if (examples.length - before !== (source.match(/<SoplangCodeWindow\b/g) ?? []).length) throw new Error(`Unsupported code window in ${file}`);
  let index = 0;
  for (const match of source.matchAll(/```soplang\n([\s\S]*?)\n```/g)) {
    examples.push({ page: file, title: `reference-${++index}.sop`, code: match[1] });
  }
}
const expectedErrors: Record<string, string> = {
  "03_variables.mdx/declare_once.sop": "[E020]",
  "03_variables.mdx/static_type_error.sop": "[E022]",
  "03_variables.mdx/constants_reassign_error.sop": "[E020]",
  "08_functions.mdx/typed_functions_error.sop": "[E022]",
};
const fixtures: Record<string, string[]> = {
  "18_modules.mdx/main.sop": ["utils/xisaab.sop"],
  "14_keywords-reference.mdx/reference/main.sop": ["reference/_math_lib.sop"],
};
const environment = { ...process.env, NO_COLOR: "1" };
const invoke = (command: string, args: string[]) => spawnSync(command, args, {
  encoding: "utf8", input: "19\n", timeout: 30000, env: environment,
});
function assertResult(result: ReturnType<typeof invoke>, error: string | undefined, label: string) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (error ? result.status !== 1 || !result.stderr.includes(error) : result.status !== 0) {
    throw new Error(`${label}: expected ${error ?? "success"}, got exit ${result.status}\n${result.stderr}`);
  }
}
function normalizeRandom(output: string, example: Example) {
  if (example.title !== "builtins_examples.sop") return output;
  return output.replace(/^Random: [1-6]$/m, "Random: <1-6>").replace(/^(Cas|Buluug|Cagaar)$/m, "<colour>");
}
const work = mkdtempSync(join(tmpdir(), "soplang-site-docs-"));
let passed = 0;
try {
  for (const [index, example] of examples.entries()) {
    const key = `${example.page}/${example.title}`;
    const folder = join(work, String(index)); mkdirSync(folder);
    const file = join(folder, "example.sop"); writeFileSync(file, example.code);
    for (const title of fixtures[key] ?? []) {
      const fixture = examples.find((item) => item.page === example.page && item.title === title);
      if (!fixture) throw new Error(`Missing fixture ${title}`);
      const path = join(folder, title.replace(/^reference\//, ""));
      mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, fixture.code);
    }
    const expectedError = expectedErrors[key];
    const jit = invoke(compiler, ["--no-color", file]);
    assertResult(jit, expectedError, `${key} (JIT)`);
    const binary = join(folder, process.platform === "win32" ? "program.exe" : "program");
    const build = invoke(compiler, ["--no-color", "--build", file, "-o", binary]);
    if (expectedError) {
      assertResult(build, expectedError, `${key} (LLVM analysis)`);
    } else {
      assertResult(build, undefined, `${key} (LLVM build)`);
      const native = invoke(binary, []);
      assertResult(native, undefined, `${key} (LLVM execution)`);
      if (normalizeRandom(jit.stdout, example) !== normalizeRandom(native.stdout, example)) throw new Error(`Backend output mismatch: ${key}`);
      for (const line of example.code.split("\n")) {
        const match = line.match(/^\s*qor\(.*\)\s*\/\/\s*(.+?)\s*$/);
        if (!match || /^(error\b|prints\b|comment:|khalad|waxay |faallo |\[E\d)/i.test(match[1])) continue;
        const expected = match[1].replace(/\s+\([^)]*\)$/, "").replace(/^"(.*)"$/, "$1");
        if (!jit.stdout.includes(expected)) throw new Error(`${key}: documented output missing: ${expected}`);
      }
    }
    passed++;
  }
  for (const key of Object.keys(expectedErrors)) if (!examples.some((e) => `${e.page}/${e.title}` === key)) throw new Error(`Stale expected error: ${key}`);
  console.log(`Verified ${passed} documentation examples through JIT and LLVM, including ${Object.keys(expectedErrors).length} intentional errors.`);
} finally { rmSync(work, { recursive: true, force: true }); }
