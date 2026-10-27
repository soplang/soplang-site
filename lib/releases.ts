import { latestVersion } from "../constants/latestVersion";

export type ReleaseAsset = { name: string; url: string; size: number; downloads: number };
export type Release = {
  tag: string;
  name: string;
  url: string;
  publishedAt: string | null;
  prerelease: boolean;
  assets: ReleaseAsset[];
};
export type ApiRelease = {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
  assets: { name: string; browser_download_url: string; size: number; download_count: number }[];
};

// Published v3 assets remain available when GitHub's API is rate limited or offline.
export const currentRelease: Release = {
  tag: latestVersion,
  name: `Soplang ${latestVersion}`,
  url: `https://github.com/soplang/soplang/releases/tag/${latestVersion}`,
  publishedAt: "2026-10-27T04:54:26Z",
  prerelease: false,
  assets: [
    ["SHA256SUMS", 471],
    ["soplang-3.6.0-linux-x86_64.tar.gz", 102326146],
    ["soplang-3.6.0-macos-arm64.tar.gz", 79690831],
    ["soplang-3.6.0-windows-AMD64.zip", 172738709],
    ["soplang-setup.exe", 105773479],
    ["soplang_3.6.0_amd64.deb", 72655762],
  ].map(([name, size]) => ({
    name: String(name), size: Number(size), downloads: 0,
    url: `https://github.com/soplang/soplang/releases/download/${latestVersion}/${name}`,
  })),
};

export function mapRelease(release: ApiRelease): Release {
  return {
    tag: release.tag_name,
    name: release.name || release.tag_name,
    url: release.html_url,
    publishedAt: release.published_at,
    prerelease: release.prerelease,
    assets: release.assets.map((asset) => ({
      name: asset.name, url: asset.browser_download_url,
      size: asset.size, downloads: asset.download_count,
    })),
  };
}

export function stableRelease(release: ApiRelease | null): Release {
  if (!release || release.draft || release.prerelease) return currentRelease;
  // An older cached API response must not undo a verified site release update.
  const parts = (tag: string) => /^v?(\d+)\.(\d+)\.(\d+)$/.exec(tag)?.slice(1).map(Number);
  const remote = parts(release.tag_name);
  const snapshot = parts(currentRelease.tag);
  if (!remote || !snapshot) return currentRelease;
  for (let index = 0; index < 3; index++) {
    if (remote[index] < snapshot[index]) return currentRelease;
    if (remote[index] > snapshot[index]) return mapRelease(release);
  }
  return mapRelease(release);
}

// Use actual asset names so a newly published release cannot show old checksum commands.
export function checksumCommands(release: Release): { windows: string; unix: string } {
  const windows = release.assets.find((asset) => asset.name === "soplang-setup.exe")
    ?? release.assets.find((asset) => /windows-AMD64\.zip$/i.test(asset.name));
  const linux = release.assets.find((asset) => /_amd64\.deb$/i.test(asset.name))
    ?? release.assets.find((asset) => /linux-x86_64\.tar\.gz$/i.test(asset.name));
  const macos = release.assets.find((asset) => /macos-arm64\.tar\.gz$/i.test(asset.name));
  return {
    windows: windows ? `Get-FileHash .\\${windows.name} -Algorithm SHA256` : "# No Windows package is attached to this release.",
    unix: [
      linux && `# Linux\nsha256sum ${linux.name}`,
      macos && `# macOS: Apple Silicon\nshasum -a 256 ${macos.name}`,
    ].filter(Boolean).join("\n\n") || "# See the release for available packages.",
  };
}
