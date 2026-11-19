#!/usr/bin/env node
// Validates the project skills in ../.claude/skills: every required skill exists, has YAML
// frontmatter with a `name` equal to its folder and a usable `description`, and real content.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".claude", "skills");
const REQUIRED = [
  "bulgarian-fiscal-expert",
  "sigma-data-engineer",
  "budget-document-intelligence",
  "fiscal-calculation-auditor",
  "political-claim-factchecker",
  "financial-data-visualization",
  "municipal-budget-geo",
  "budget-editorial-review",
];

const errors = [];
const present = existsSync(root) ? readdirSync(root) : [];
for (const name of REQUIRED) if (!present.includes(name)) errors.push(`${name}: missing folder`);

for (const dir of present) {
  const file = join(root, dir, "SKILL.md");
  if (!existsSync(file)) {
    errors.push(`${dir}: missing SKILL.md`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) {
    errors.push(`${dir}: no YAML frontmatter`);
    continue;
  }
  const fm = Object.fromEntries(
    m[1].split("\n").map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
  const body = m[2];
  if (fm.name !== dir) errors.push(`${dir}: frontmatter name "${fm.name}" ≠ folder`);
  if (!/^[a-z0-9-]{1,64}$/.test(fm.name ?? "")) errors.push(`${dir}: invalid name`);
  if (!fm.description || fm.description.length < 80) errors.push(`${dir}: description too short`);
  if (fm.description && fm.description.length > 1024)
    errors.push(`${dir}: description > 1024 chars`);
  if (body.split("\n").filter((l) => l.trim()).length < 20) errors.push(`${dir}: body too thin`);
  if (!/(- \[ \]|Чеклист|Проверки|Процедура|Стъпки)/.test(body))
    errors.push(`${dir}: no checks/procedure section`);
  if (!/(https?:\/\/|\.bg|Евростат|СИГМА|skill `)/.test(body))
    errors.push(`${dir}: no sources referenced`);
}

if (errors.length) {
  console.error(`✗ ${errors.length} skill problem(s):\n  ` + errors.join("\n  "));
  process.exit(1);
}
console.log(`✓ ${present.length} skills valid: ${present.join(", ")}`);
