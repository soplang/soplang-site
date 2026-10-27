import { source } from "@/lib/source";
import { CONTACT_EMAIL, CREATOR, MAINTAINER, REPOSITORY_URL, SITE_DESCRIPTION, absoluteUrl } from "@/lib/site";

export const revalidate = false;

export async function GET() {
  const docs = source
    .getPages()
    .map((page) => `- [${page.data.title}](${absoluteUrl(`${page.url}.mdx`)}): ${page.data.description ?? ""}`);

  const lines = [
    "# Soplang",
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Soplang (Somali Programming Language) is the first programming language with Somali keywords.",
    `It was created by ${CREATOR.name} (${CREATOR.url}) and first released in October 2023.`,
    `It is developed and maintained by ${MAINTAINER.name} (${MAINTAINER.url}). License: MIT.`,
    "",
    "## Key facts",
    "",
    "- Keywords are Somali: qor (print), door (variable), hawl (function), celi (return), haddii (if), kale (else), intay (while), kuceli (for), qaab (class), tijaabi/qabo (try/catch), keen (import).",
    "- Supports dynamic typing (door) and static typing (abn, jajab, qoraal, bool, teed, walax).",
    "- CLI help, argument errors, and normal compiler/runtime diagnostics are in Somali. SOPLANG_ERROR_DETAILS=1 adds original external technical details, which can be English.",
    "- The compiler is written in Rust and uses Cranelift for JIT and bundled LLVM and a platform linker for standalone builds in official packages.",
    "- Soplang 3.6.0 packages target Windows x64, macOS Apple Silicon, and Linux x86_64. Docker Hub provides a Linux amd64 image.",
    `- Source code: ${REPOSITORY_URL}`,
    `- Contact: ${CONTACT_EMAIL}`,
    "",
    "## Pages",
    "",
    `- [Home](${absoluteUrl("/")}): What Soplang is and how to start`,
    `- [Downloads](${absoluteUrl("/downloads")}): Install on Windows, macOS, or Linux`,
    `- [About](${absoluteUrl("/about")}): History, mission, creator, and maintainer`,
    `- [Contribute](${absoluteUrl("/contribute")}): How to help build Soplang`,
    `- [Full documentation as one file](${absoluteUrl("/llms-full.txt")})`,
    "",
    "## Documentation",
    "",
    ...docs,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
