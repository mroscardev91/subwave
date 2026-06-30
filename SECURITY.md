# Security & privacy

Subwave is a **100% client-side** static web app. There is no backend, no
database, no API keys and no user accounts. Your media is read with the File
API, processed in Web Workers (FFmpeg WASM, transformers.js) and exported as a
local download — **it never leaves your device**.

The only outbound requests a normal session makes are:

- **AI models** (Whisper for transcription, OPUS-MT for translation) downloaded
  once from [Hugging Face](https://huggingface.co) and cached in your browser.

Everything else — the app, fonts and the FFmpeg WASM core — is served from the
same origin. A `Content-Security-Policy` (`vercel.json`) restricts `connect-src`
to `self` + Hugging Face, so exfiltration is blocked, not merely "not observed".
You can verify this yourself: open DevTools → **Network** and confirm there is
zero upload of your file.

## Reporting a vulnerability

If you find a security issue, please **do not open a public issue**. Email the
maintainer at the address on the [GitHub profile](https://github.com/mroscardev91)
with a description and steps to reproduce. You'll get a response as soon as
possible.

## Scope

In scope: anything that breaks the privacy guarantee (media leaving the device),
XSS, or CSP bypasses. Out of scope: the third-party Hugging Face model CDN and
issues that require a compromised local machine or browser.
