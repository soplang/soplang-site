import { InstallTabs } from "@/components/downloads/InstallTabs";
import { JsonLd, breadcrumbSchema, softwareSchema } from "@/components/JsonLd";
import CodeWindow from "@/components/SoplangCodeWindow";
import { assetLabel, createPlatforms } from "@/constants/installData";
import { GITHUB_URL, getLatestRelease, getReleases } from "@/lib/github";
import { checksumCommands } from "@/lib/releases";
import { Icon } from "@iconify/react";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Download Soplang 3 for Windows, macOS and Linux",
  description: "Download Soplang 3 for Windows x64, macOS Apple Silicon and Linux x86_64. Get native packages, checksums, Docker commands and LLVM build requirements.",
  alternates: { canonical: "/downloads" },
  openGraph: {
    title: "Download Soplang 3",
    description: "Official Soplang packages for Windows x64, macOS Apple Silicon and Linux x86_64, with checksums and installation instructions.",
    url: "/downloads", images: "/og.png",
  },
};

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) : "";
}

export default async function DownloadsPage() {
  const [release, releases] = await Promise.all([getLatestRelease(), getReleases()]);
  const platforms = createPlatforms(release);
  const checksums = checksumCommands(release);
  const checksum = release.assets.find((asset) => asset.name === "SHA256SUMS");

  return (
    <div className="min-h-screen bg-surface">
      <JsonLd data={[softwareSchema(release.tag), breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Downloads", path: "/downloads" }])]} />
      <section className="page-hero">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="eyebrow">{release.tag} is the latest stable release{release.publishedAt && ` · ${formatDate(release.publishedAt)}`}</p>
          <h1 className="type-title mt-5 max-w-3xl">Download Soplang 3</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            A Rust compiler with Cranelift JIT for running programs and LLVM for building standalone executables. Choose the package for your system, or use Docker with the build tools included.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={release.url} className="btn-ghost">Release notes</a>
            <a href="https://www.somast.so/en/blog/soplang-3.0-release" className="btn-ghost">What&apos;s new in Soplang 3</a>
          </div>
        </div>
      </section>

      <section className="section-tight" aria-labelledby="native-downloads">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 id="native-downloads" className="type-section">Native packages</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">Run files and use the REPL without installing Python, Rust or clang. Native builds have additional toolchain requirements below.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {platforms.map((platform) => {
              const files = release.assets.filter((asset) => platform.assetPattern.test(asset.name));
              return (
                <div key={platform.id} className="panel flex min-w-0 flex-col p-7 sm:p-8">
                  <Icon icon={platform.icon} className="h-9 w-9 text-ink" aria-hidden="true" />
                  <h3 className="mt-5 text-2xl font-semibold tracking-tight text-ink">{platform.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{platform.requirements.join(" · ")}</p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{platform.notes}</p>
                  <div className="mt-6 flex flex-1 flex-col justify-end gap-3">
                    {files.length ? files.map((file) => (
                      <a key={file.url} href={file.url} className="btn-primary w-full flex-wrap text-center">
                        <Icon icon="lucide:download" className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {assetLabel(file)}<span className="font-normal opacity-80">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                      </a>
                    )) : <a href={release.url} className="btn-ghost">View available packages</a>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">These are the published architectures. For other targets, <a href="#source" className="font-semibold text-primary hover:underline">build from source</a>. Keep the complete installed or extracted package so <code>--build</code> can find its matching runtime libraries.</p>
        </div>
      </section>

      <section id="checksums" className="section-tight scroll-mt-24" aria-labelledby="checksums-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 id="checksums-heading" className="type-section">Verify your download</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{checksum ? <a href={checksum.url} className="font-semibold text-primary hover:underline">Download SHA256SUMS</a> : <a href={release.url} className="font-semibold text-primary hover:underline">Open the release checksums</a>} and compare the SHA-256 hash for your package with its entry. The manifest covers all platforms; you only need the entry for the file you downloaded.</p>
          <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-2">
            <CodeWindow title="PowerShell" code={checksums.windows} />
            <CodeWindow title="Linux / macOS" code={checksums.unix} />
          </div>
        </div>
      </section>

      <section id="command-line" className="section scroll-mt-24" aria-labelledby="install-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="eyebrow">Installation</p>
          <h2 id="install-heading" className="type-section mt-3">Install and check your version</h2>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">Use the commands for your operating system. After installation, run <code>soplang --version</code>. Docker commands use the public Linux amd64 image from Docker Hub.</p>
          <div className="mt-8"><InstallTabs platforms={platforms.map(({ id, name, icon, install }) => ({ id, name, icon, install }))} /></div>
        </div>
      </section>

      <section className="section-tight" aria-labelledby="run-build-heading">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="eyebrow">Run</p><h2 id="run-build-heading" className="type-section mt-3">Your first program</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">Save <code>qor(&quot;Salaan, Adduunka!&quot;)</code> as <code>hello.sop</code>. Running a file uses Cranelift JIT. Running <code>soplang</code> without a file opens the persistent REPL.</p>
            <CodeWindow title="Terminal" code={`soplang hello.sop\nsoplang`} />
            <Link href="/docs/00_getting-started" className="font-semibold text-primary hover:underline">Getting started</Link>
          </div>
          <div className="min-w-0">
            <p className="eyebrow">Build</p><h2 className="type-section mt-3">A standalone executable</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground"><code>--build</code> uses LLVM IR, clang 15+, a platform linker/SDK and the exact Rust compiler used for your package (Rust 1.94.0 for v3.0.1). Read <code className="break-all">lib/soplang/rustc-version.txt</code> in the package. Installed builds do not invoke Cargo.</p>
            <CodeWindow title="Terminal" code={`soplang --build hello.sop -o hello\n./hello`} />
            <p className="text-sm leading-relaxed text-muted-foreground">On Windows, use <code>-o hello.exe</code> and run <code>.\hello.exe</code> in PowerShell. The executable runs on its target platform without Soplang or the original source files. The Docker image includes the build toolchain.</p>
            <Link href="/docs/00_installation#building-standalone-programs" className="mt-4 inline-flex font-semibold text-primary hover:underline">Native build setup</Link>
          </div>
        </div>
      </section>

      <section id="source" className="section scroll-mt-24" aria-labelledby="source-heading">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Source</p><h2 id="source-heading" className="type-section mt-3">Build the release from source</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">Soplang is open source under the MIT license. Install Rust through rustup, then build the tagged release. Keep the checkout and build artifacts together for native builds, or create a complete runtime package with the repository&apos;s packaging tools.</p>
            <div className="mt-6 flex flex-wrap gap-3"><a href={GITHUB_URL} className="btn-primary">View repository</a><Link href="/docs/00_installation" className="btn-ghost">Installation guide</Link></div>
          </div>
          <div className="min-w-0"><CodeWindow title="Terminal" code={`git clone --branch ${release.tag} --depth 1 https://github.com/soplang/soplang.git\ncd soplang\nrustup toolchain install 1.94.0 --profile minimal\ncargo +1.94.0 build --release\n./target/release/soplang --version`} /></div>
        </div>
      </section>

      {releases.length > 0 && <section className="section-tight pb-20" aria-labelledby="release-history">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="eyebrow">Releases</p><h2 id="release-history" className="type-section mt-3">Release history</h2>
          <ul className="mt-8 divide-y divide-line border-y border-line">{releases.map((item) => (
            <li key={item.tag} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div><span className="font-semibold text-ink">{item.name}{item.prerelease && " (prerelease)"}</span>{item.publishedAt && <span className="ml-3 text-sm text-muted-foreground">{formatDate(item.publishedAt)}</span>}</div>
              <a href={item.url} className="text-sm font-bold text-primary hover:text-primary-hover">Release notes<span className="sr-only"> for {item.tag}</span></a>
            </li>
          ))}</ul>
        </div>
      </section>}
    </div>
  );
}
