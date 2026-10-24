// Reported inventory only. No execution, network, persistence or advisory database.
export const MAX_VERSION_CHARS = 8192;

const unresolved = message => ({state:'unassessed', title:message, versions:'',
  next:'Use one complete, unwrapped curl --version output, including its Features line.'});

export function readCurlVersion(text) {
  if (typeof text !== 'string') return unresolved('That is not version output.');
  if (text.length > MAX_VERSION_CHARS) return unresolved('That output is too long. The limit is 8,192 characters.');
  if (!text.trim()) return {state:'empty',title:'Paste a complete version output to begin.',versions:'',next:''};
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(text)) {
    return unresolved('Remove terminal formatting or control characters first.');
  }
  const lines = text.replace(/\r\n?/g,'\n').trim().split('\n').map(line=>line.trim()).filter(Boolean);
  const headers = lines.filter(line=>/^curl\s/i.test(line));
  const features = lines.filter(line=>/^Features:/i.test(line));
  if (headers.length !== 1 || features.length !== 1) return unresolved('I need one curl header and one Features line.');
  if ((headers[0].match(/\bcurl(?=\s)/gi)||[]).length !== 1 ||
      (headers[0].match(/\blibcurl\//gi)||[]).length !== 1) {
    return unresolved('The header contains additional or conflicting version fields.');
  }
  const version = '(\\d+\\.\\d+\\.\\d+(?:[-+][A-Za-z0-9._-]+)?)';
  const tool = headers[0].match(new RegExp('^curl\\s+'+version+'(?:\\s|$)','i'));
  const libraries = [...headers[0].matchAll(new RegExp('\\slibcurl/'+version+'(?=\\s|$)','gi'))];
  if (!tool || libraries.length !== 1 || lines[0] !== headers[0]) return unresolved('The curl and libcurl header is incomplete or ambiguous.');
  if (lines.at(-1) !== features[0]) return unresolved('The Features line appears wrapped or followed by other output.');
  const flags = features[0].slice(features[0].indexOf(':')+1).trim().split(/\s+/);
  if (flags.some(flag=>!/^([A-Za-z][A-Za-z0-9_-]*)$/.test(flag))) return unresolved('The Features line is incomplete or has unsupported formatting.');
  const normalized = flags.map(flag=>flag.toLowerCase());
  if (new Set(normalized).size !== normalized.length) return unresolved('The Features line repeats a feature. Check the original output.');
  const listed = normalized.includes('brotli');
  if (!listed && /\bbrotli\//i.test(headers[0])) return unresolved('The library header and Features line disagree about Brotli.');
  const mismatch = tool[1] !== libraries[0][1];
  return {state:'reported',brotli:listed?'listed':'not-listed',version_mismatch:mismatch,
    title:listed?'This output lists Brotli support.':'Brotli is not listed in this output.',
    versions:'curl '+tool[1]+' · libcurl '+libraries[0][1]+(mismatch?' — the versions differ.':''),
    next:listed?'Next: check the libcurl used by the relevant application, its decoding options and the response encoding.':
      'Check the curl or libcurl inside the relevant application or container. Other builds can differ.'};
}
