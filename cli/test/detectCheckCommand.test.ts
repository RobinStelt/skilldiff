import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectCheckCommand } from "../src/category/detectCheckCommand.js";

describe("detectCheckCommand", () => {
  let dir: string;

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("detects npm test from a real test script in package.json", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-check-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { test: "vitest run" } }));
    expect(detectCheckCommand(dir)).toEqual({ cmd: "npm", args: ["test"] });
  });

  it("does not treat npm's default placeholder test script as a real check", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-check-"));
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ scripts: { test: 'echo "Error: no test specified" && exit 1' } }),
    );
    expect(detectCheckCommand(dir)).toBeNull();
  });

  it("detects pytest from pyproject.toml", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-check-"));
    writeFileSync(join(dir, "pyproject.toml"), "[tool.pytest.ini_options]\n");
    expect(detectCheckCommand(dir)).toEqual({ cmd: "pytest", args: [] });
  });

  it("detects pytest from a tests/test_*.py convention without a config file", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-check-"));
    mkdirSync(join(dir, "tests"));
    writeFileSync(join(dir, "tests", "test_foo.py"), "def test_foo(): assert True\n");
    expect(detectCheckCommand(dir)).toEqual({ cmd: "pytest", args: [] });
  });

  it("detects go test from go.mod", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-check-"));
    writeFileSync(join(dir, "go.mod"), "module example.com/foo\n");
    expect(detectCheckCommand(dir)).toEqual({ cmd: "go", args: ["test", "./..."] });
  });

  it("detects cargo test from Cargo.toml", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-check-"));
    writeFileSync(join(dir, "Cargo.toml"), "[package]\nname = \"foo\"\n");
    expect(detectCheckCommand(dir)).toEqual({ cmd: "cargo", args: ["test"] });
  });

  it("returns null when nothing recognizable is present", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-check-"));
    expect(detectCheckCommand(dir)).toBeNull();
  });

  it("prefers npm test over a coincidentally present pytest marker", () => {
    dir = mkdtempSync(join(tmpdir(), "skill-ab-check-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { test: "vitest run" } }));
    writeFileSync(join(dir, "pyproject.toml"), "[tool.pytest.ini_options]\n");
    expect(detectCheckCommand(dir)).toEqual({ cmd: "npm", args: ["test"] });
  });
});
