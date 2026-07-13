export { replacePlaceholders } from "./placeholders";

export function createGmailPreviewWrapper(htmlContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #222222;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: break-word;
    }

    * {
      max-width: 100%;
      box-sizing: border-box;
    }

    h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
    h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; }
    h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
    h4 { font-size: 1em; font-weight: bold; margin: 1em 0; }

    p, div { margin: 0.5em 0; word-wrap: break-word; overflow-wrap: break-word; }

    ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    li { margin: 0.25em 0; }

    a { color: #2563eb; text-decoration: underline; }

    blockquote {
      margin: 0.5em 0;
      padding-left: 1em;
      border-left: 3px solid #e5e7eb;
      color: #4b5563;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
}
