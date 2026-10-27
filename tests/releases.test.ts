import test from "node:test";
import assert from "node:assert/strict";
import { currentRelease, mapRelease, stableRelease, checksumCommands, type ApiRelease } from "../lib/releases";
import { latestVersion } from "../constants/latestVersion";
import { createPlatforms } from "../constants/installData";

const apiRelease: ApiRelease = {
  tag_name: "v3.6.1", name: "Soplang v3.6.1", html_url: "https://github.com/soplang/soplang/releases/tag/v3.6.1",
  published_at: "2026-11-01T00:00:00Z", draft: false, prerelease: false,
  assets: [{ name: "SHA256SUMS", browser_download_url: "https://github.com/soplang/soplang/releases/download/v3.6.1/SHA256SUMS", size: 471, download_count: 7 }],
};

test("stable selection rejects drafts and prereleases and retains working downloads on API failure", () => {
  assert.deepEqual(stableRelease(apiRelease), mapRelease(apiRelease));
  for (const unavailable of [null, { ...apiRelease, draft: true }, { ...apiRelease, prerelease: true }]) {
    const fallback = stableRelease(unavailable);
    assert.equal(fallback.tag, latestVersion);
    assert.equal(fallback.assets.length, 6);
    assert.ok(fallback.publishedAt);
    assert.ok(fallback.assets.every((asset) => asset.size > 0));
    assert.ok(fallback.assets.every((asset) => asset.url.startsWith(`https://github.com/soplang/soplang/releases/download/${latestVersion}/`)));
  }
});

test("every published native package belongs to exactly one platform and checksums are separate", () => {
  const platforms = createPlatforms(currentRelease);
  assert.deepEqual(platforms.map((p) => currentRelease.assets.filter((a) => p.assetPattern.test(a.name)).length), [2, 1, 2]);
  for (const asset of currentRelease.assets) {
    assert.equal(platforms.filter((p) => p.assetPattern.test(asset.name)).length, asset.name === "SHA256SUMS" ? 0 : 1);
  }
  assert.ok(platforms.find((p) => p.id === "linux")?.requirements.includes("glibc 2.39+"));
  assert.ok(platforms.find((p) => p.id === "macos")?.requirements.includes("Apple Silicon (ARM64)"));
});

test("install commands use the displayed release and real package layouts", () => {
  const platforms = createPlatforms(currentRelease);
  const windows = platforms.find((p) => p.id === "windows")!;
  assert.ok(windows.install.some((m) => m.command.includes("\\soplang\\soplang.exe --version")));
  assert.ok(platforms.find((p) => p.id === "linux")!.install.some((m) => m.command.includes("./soplang/soplang --version")));
  assert.ok(platforms.find((p) => p.id === "macos")!.install.some((m) => m.command.includes("./Soplang.app/Contents/MacOS/soplang --version")));
  for (const platform of platforms) {
    const docker = platform.install.find((method) => method.name === "Docker")!;
    assert.ok(docker.command.includes("--platform linux/amd64"));
    assert.ok(docker.command.includes(`soplang/soplang:${latestVersion.replace(/^v/, "")}`));
    assert.ok(docker.command.includes("/scripts:ro"));
    assert.ok(!platform.install.some((method) => method.name === "winget"));
  }
});

test("checksum commands use the selected release assets instead of fixed versions", () => {
  const commands = checksumCommands(currentRelease);
  for (const name of ["soplang-setup.exe", `soplang_${latestVersion.slice(1)}_amd64.deb`, `soplang-${latestVersion.slice(1)}-macos-arm64.tar.gz`]) {
    assert.ok(`${commands.windows}\n${commands.unix}`.includes(name));
  }
  const archiveOnly = { ...currentRelease, tag: "v3.2.7", assets: [
    "soplang-3.2.7-linux-x86_64.tar.gz", "soplang-3.2.7-windows-AMD64.zip",
  ].map((name) => ({ name, url: `https://example.test/${name}`, size: 1, downloads: 0 })) };
  const archiveCommands = checksumCommands(archiveOnly);
  assert.ok(archiveCommands.unix.includes("sha256sum soplang-3.2.7-linux-x86_64.tar.gz"));
  assert.ok(archiveCommands.windows.includes("soplang-3.2.7-windows-AMD64.zip"));
  assert.ok(!archiveCommands.unix.includes("macos"));
  assert.ok(!archiveCommands.unix.includes(".deb"));
});

test("an older cached release cannot replace the verified release snapshot", () => {
  assert.deepEqual(stableRelease({ ...apiRelease, tag_name: "v3.0.0" }), currentRelease);
  assert.deepEqual(stableRelease({ ...apiRelease, tag_name: "nightly" }), currentRelease);
  const nextMinor = { ...apiRelease, tag_name: "v3.10.0" };
  assert.deepEqual(stableRelease(nextMinor), mapRelease(nextMinor));
});
