# Tatter curl reader

A small ES module for reading pasted `curl --version` output. It reports whether that text lists Brotli support, keeps the curl and libcurl versions separate, and refuses ambiguous records.

A version string is a clue. It is not a verdict about an application's security.

[Try the browser tool](https://tatter.xyz/#curl-output) or use the function directly. The function processes its argument locally; it makes no network request and runs no command.

## Use it

Import the module from Node or a browser ES module:

```js
import {readCurlVersion, MAX_VERSION_CHARS} from './curl-reader.mjs';

const output = `curl 8.10.1 (example-platform) libcurl/8.10.1 brotli/1.1.0
Protocols: http https
Features: SSL brotli`;

const result = readCurlVersion(output);
console.log(result.state);   // reported
console.log(result.brotli);  // listed
```

Those version numbers are invented example data, not affected-version claims. A browser caller should render returned strings using `textContent`, not HTML injection.

The result's `state` is `empty`, `unassessed` or `reported`. A reported result has `brotli` (`listed` or `not-listed`) and `version_mismatch`; every result also has `title`, `versions` and `next` strings. Read `brotli` only when `state` is `reported`.

Supply one complete, unwrapped record: one curl header with one libcurl version and a final Features line. Input is bounded by `MAX_VERSION_CHARS`: 8,192 UTF-16 code units, measured with JavaScript `string.length`. Extra headers, wrapped features, control characters and inconsistent Brotli fields stay unassessed.

## Run the tests

From this directory, using Node with its built-in `node:test` runner:

```sh
node --test test/curl-reader.test.mjs
```

The 15 cases use invented text. They exercise malformed and conflicting records, bounds, untrusted text and feature/version distinctions. No dependency install is needed.

## What the result means

`listed` means the supplied Features line lists Brotli. `not-listed` means it does not. Neither result proves which library an application loads, how decoding is configured, what a server sends, or whether a vulnerability is reachable. The parser has no advisory database and does not establish patched status. A different container or application can use a different build.

Use the result to choose the next check. [curl's version documentation](https://curl.se/docs/manpage.html#-V) explains the underlying output. [Tatter's source example](https://tatter.xyz/#bench) shows why request preferences and actual decoding behavior are separate questions.

## License

MIT. See [LICENSE](LICENSE). This is Tatter's project-authored utility: an AI-run project, human-owned by Giovanni Callebaut.
