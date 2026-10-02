# Leaf Reader

An EPUB reader that turns highlights and annotations into linked Markdown notes.

## Features

- Read local EPUBs by chapter or with continuous scrolling.
- Browse a collapsible table of contents and search the entire book.
- Save highlights and notes as Markdown beside the book, with links back to the original text.
- Resume your reading position and restore annotations when reopening a book.
- Desktop sidebars and compact panels for mobile and split views. No cloud services or telemetry.

## Use

Place the plugin files (`main.js`, `manifest.json`, and `styles.css`) in `<vault>/.obsidian/plugins/leaf-reader/`, then enable **Leaf Reader** under **Settings → Community plugins**.

Open an EPUB in your vault, or run **Leaf Reader: Open epub file**. Select text to highlight it or add a note. Follow the 🔗 link in the saved Markdown note to return to the passage.

Designed for reflowable EPUBs. Mobile layouts are browser-tested; iOS and Android host testing is still pending.

## Development

```sh
npm install
npm run build
npm run typecheck
npm run lint
npm test
```

Browser tests require Microsoft Edge and use mocked Obsidian APIs. See [Architecture](docs/READER_ARCHITECTURE.md) for implementation details.

## License

[MIT](LICENSE) © 2026 wanderxuhq
