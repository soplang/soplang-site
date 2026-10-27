# Soplang Website

The website and documentation for Soplang 3 at [soplang.org](https://soplang.org).
Built with Next.js, Fumadocs and TypeScript.

## Development

Install Node.js 20.9 or later and Bun, then run:

```sh
bun install --frozen-lockfile
bun run dev
```

`NEXT_PUBLIC_SITE_URL` sets the canonical site origin (default: `https://soplang.org`).
An optional server-only `GITHUB_TOKEN` raises the GitHub API rate limit. Never
expose that token through a `NEXT_PUBLIC_` variable.

## Checks

```sh
bun test
bun run types:check
bun run lint
bun run build
```

To verify documentation examples, install Soplang 3.6.0 with its bundled
native build components, then provide the compiler path:

```sh
bun run docs:check /absolute/path/to/soplang
```

The checker executes every Soplang code window through Cranelift JIT and LLVM,
compares backend output, checks documented output comments, and validates the
error codes of intentional failures. It supplies input for interactive examples
and materializes the helper files shown in import examples. LLVM verification
needs the complete 3.6 package, including its bundled runtime and linker. Source
checkouts need their own build dependencies.

## Documentation

Docs target **Soplang 3.6.0**. Check behavior against the released compiler and
its [language reference](https://github.com/soplang/soplang/blob/v3.6.0/docs/language/keywords.md).
Use preferred names in tutorials: `kale`, `tijaabi`, `dhis`, `maran`, `geli`,
`midee`, `saar`, `hel`, `hore`, `dambe`, `weynee` and `yaree`. Keep supported
earlier spellings in the reference and migration guide, with their actual
behavior documented.

Write self-contained examples using `SoplangCodeWindow` with a `.sop` title and
static template literal. For examples involving multiple files, show each file
and add its dependency mapping in `scripts/check-docs.ts`. Mark intentional
failures in the checker's error-code registry. Update `content/docs/meta.json`
when adding a guide.

## Release downloads

The download page reads GitHub's latest stable release. Drafts and prereleases
are never selected as stable. If the API is unavailable, the verified snapshot
in `lib/releases.ts` keeps the current package and checksum links available.

For a release update, verify the published assets, names, sizes, architectures,
platform requirements and runtime toolchain. Update `constants/latestVersion.ts`,
the snapshot, installation commands and documentation together. Run the download
regression tests and check the page on desktop and mobile.

Sponsor wordmarks in `public/sponsors` are copied from the Somast website's
provided brand assets. Preserve their proportions and full names.
