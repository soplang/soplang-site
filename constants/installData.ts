import type { Release, ReleaseAsset } from "../lib/releases";

export type PlatformId = "windows" | "macos" | "linux";
export type InstallMethod = { name: string; description: string; command: string };
export type Platform = {
  id: PlatformId;
  name: string;
  icon: string;
  requirements: string[];
  notes: string;
  assetPattern: RegExp;
  install: InstallMethod[];
};
export type InstallPlatform = Pick<Platform, "id" | "name" | "icon" | "install">;

export function assetLabel(asset: ReleaseAsset): string {
  if (asset.name.endsWith(".exe")) return "Windows installer";
  if (asset.name.endsWith(".zip")) return "Windows ZIP";
  if (asset.name.endsWith(".deb")) return "Debian package";
  if (asset.name.includes("macos")) return "Apple Silicon archive";
  return "Linux archive";
}

export function createPlatforms(release: Release): Platform[] {
  const docker = (windows = false): InstallMethod => ({
    name: "Docker",
    description: "Linux amd64 image with the compiler and native build support. Docker Desktop can emulate it on Apple Silicon.",
    command: `docker run --platform linux/amd64 -it --rm soplang/soplang:${release.tag.replace(/^v/, "")}\n\n# Run hello.sop from the current folder\ndocker run --platform linux/amd64 --rm -v "${windows ? "${PWD}" : "$PWD"}:/scripts:ro" soplang/soplang:${release.tag.replace(/^v/, "")} hello.sop`,
  });
  const platforms: Platform[] = [
    { id: "windows", name: "Windows", icon: "fa6-brands:windows",
      requirements: ["x64 (AMD64)"], notes: "The installer is unsigned. Open a new terminal after installation to use PATH changes.",
      assetPattern: /(?:^soplang-setup\.exe$|windows-AMD64\.zip$)/i, install: [] },
    { id: "macos", name: "macOS", icon: "fa6-brands:apple",
      requirements: ["Apple Silicon (ARM64)", "macOS 15.7.9+"], notes: "Command-line app bundle, not notarized. Keep the complete Soplang.app bundle together.",
      assetPattern: /macos-arm64\.tar\.gz$/i, install: [] },
    { id: "linux", name: "Linux", icon: "fa6-brands:linux",
      requirements: ["x86_64 (amd64)", "glibc 2.39+", "libgcc"], notes: "Debian package or tar archive. Keep the archive's soplang executable and lib directory together.",
      assetPattern: /(?:linux-x86_64\.tar\.gz|_amd64\.deb)$/i, install: [] },
  ];
  for (const platform of platforms) {
    const files = release.assets.filter((asset) => platform.assetPattern.test(asset.name));
    for (const file of files) {
      let command: string;
      if (file.name.endsWith(".exe")) {
        command = `Invoke-WebRequest -Uri "${file.url}" -OutFile "${file.name}"\nStart-Process .\\${file.name} -Wait\n# Open a new terminal, then run:\nsoplang --version`;
      } else if (file.name.endsWith(".zip")) {
        command = `Invoke-WebRequest -Uri "${file.url}" -OutFile "${file.name}"\nExpand-Archive -Path ".\\${file.name}" -DestinationPath ".\\soplang-${release.tag}"\n.\\soplang-${release.tag}\\soplang\\soplang.exe --version`;
      } else if (file.name.endsWith(".deb")) {
        command = `curl -fLO "${file.url}"\nsudo dpkg -i ${file.name}\nsoplang --version`;
      } else {
        const binary = platform.id === "macos" ? "./Soplang.app/Contents/MacOS/soplang" : "./soplang/soplang";
        command = `curl -fLO "${file.url}"\ntar -xzf ${file.name}\n${binary} --version`;
      }
      platform.install.push({ name: assetLabel(file), description: platform.id === "windows" ? "PowerShell commands for the official release package." : "Download and extract the official release package.", command });
    }
    platform.install.push(docker(platform.id === "windows"));
  }
  return platforms;
}
