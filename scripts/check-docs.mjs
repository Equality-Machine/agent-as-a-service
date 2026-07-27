#!/usr/bin/env node

import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([
  ".aaas",
  ".git",
  ".next",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules",
]);

const requiredFiles = [
  "README.md",
  "README.zh-CN.md",
  "LICENSE",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "GOVERNANCE.md",
  "SECURITY.md",
  "SUPPORT.md",
  ".github/ISSUE_TEMPLATE/bug.yml",
  ".github/ISSUE_TEMPLATE/feature.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "docs/README.md",
  "docs/ROADMAP.md",
];

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(absolute)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(absolute);
    }
  }
  return files;
}

function markdownTargets(source) {
  const targets = [];
  const pattern = /!?\[[^\]]*]\(([^)]+)\)/g;
  for (const match of source.matchAll(pattern)) {
    const raw = match[1].trim();
    const target = raw.startsWith("<")
      ? raw.slice(1, raw.indexOf(">"))
      : raw.split(/\s+["']/)[0];
    targets.push(target);
  }
  return targets;
}

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

const failures = [];

for (const required of requiredFiles) {
  if (!(await pathExists(path.join(root, required)))) {
    failures.push(`missing required repository file: ${required}`);
  }
}

const markdownFiles = await collectMarkdownFiles(root);
for (const file of markdownFiles) {
  const source = await readFile(file, "utf8");
  for (const target of markdownTargets(source)) {
    if (
      !target ||
      target.startsWith("#") ||
      target.startsWith("/") ||
      /^[a-z][a-z0-9+.-]*:/i.test(target)
    ) {
      continue;
    }
    const pathname = target.split("#")[0].split("?")[0];
    if (!pathname) continue;
    let decoded = pathname;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      failures.push(
        `${path.relative(root, file)} contains an invalid encoded link: ${target}`,
      );
      continue;
    }
    const resolved = path.resolve(path.dirname(file), decoded);
    if (!(await pathExists(resolved))) {
      failures.push(
        `${path.relative(root, file)} links to missing path: ${target}`,
      );
    }
  }
}

const packageJson = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
if (packageJson.license !== "MIT") {
  failures.push('package.json must declare "license": "MIT"');
}
if (!Array.isArray(packageJson.keywords) || packageJson.keywords.length < 5) {
  failures.push("package.json must include at least five discovery keywords");
}
if (!packageJson.bugs?.url) {
  failures.push("package.json must include a bugs URL");
}

const readme = await readFile(path.join(root, "README.md"), "utf8");
const chineseReadme = await readFile(
  path.join(root, "README.zh-CN.md"),
  "utf8",
);
if (!readme.includes("[中文](README.zh-CN.md)")) {
  failures.push("README.md must link to the Chinese README");
}
if (!chineseReadme.includes("[English](README.md)")) {
  failures.push("README.zh-CN.md must link to the English README");
}

if (failures.length > 0) {
  console.error("Repository documentation checks failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Repository documentation checks passed (${markdownFiles.length} Markdown files).`,
  );
}
