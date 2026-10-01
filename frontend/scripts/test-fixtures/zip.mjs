import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { basename, dirname } from "node:path";

const require = createRequire(import.meta.url);
const { zipSync } = require("cross-zip");

// cross-zip's Windows branch cannot run on Node >= 22. Before invoking
// PowerShell it pre-deletes the destination with
// `fs.rmdirSync(destination, { recursive: true })`, which throws ENOENT for a
// zip file whether it exists or not (DEP0147 changed recursive rmdir to reject
// file paths), and it stages file inputs in an `os.tmpdir()/cross-zip-*`
// folder it never removes — so every call both fails and leaks a directory.
// Zip with the system bsdtar instead: Windows 10 ships it, and this repo
// already relies on it for the ACP runtime build. compression-level=0 stores
// the payload, matching Info-ZIP's stored fallback for incompressible data:
// bsdtar's default deflate never re-synchronizes after a changed byte, which
// would stretch every old-vs-new diff to EOF and collapse the differential
// tests' multi-request scenarios into a single range. POSIX keeps cross-zip's
// `zip(1)` path so CI behavior is unchanged.
export function zipFixtureFile(source, destination) {
	if (process.platform !== "win32") {
		zipSync(source, destination);
		return;
	}
	execFileSync("tar", ["--options", "compression-level=0", "-a", "-cf", destination, "-C", dirname(source), basename(source)]);
}
