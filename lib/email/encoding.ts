export function sanitizeText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

// RFC 2045 quoted-printable encoder to keep long HTML lines intact for email clients
export function encodeQuotedPrintable(input: string): string {
  if (!input) {
    return "";
  }

  const safeChar = (byte: number): boolean => {
    return (byte >= 33 && byte <= 60) || (byte >= 62 && byte <= 126);
  };

  const toHex = (byte: number): string => {
    return "=" + byte.toString(16).toUpperCase().padStart(2, "0");
  };

  const encodeLine = (line: string): string => {
    const bytes = Buffer.from(line, "utf8");
    let encoded = "";
    let currentLength = 0;

    const lastNonWhitespaceIndex = (() => {
      for (let j = bytes.length - 1; j >= 0; j--) {
        if (bytes[j] !== 0x20 && bytes[j] !== 0x09) {
          return j;
        }
      }
      return -1;
    })();

    const pushChunk = (chunk: string) => {
      if (currentLength + chunk.length > 75) {
        encoded += "=\r\n";
        currentLength = 0;
      }

      encoded += chunk;
      currentLength += chunk.length;
    };

    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      const isSpaceOrTab = byte === 0x20 || byte === 0x09;
      const isTrailingWhitespace = i > lastNonWhitespaceIndex;

      if (!isSpaceOrTab && safeChar(byte) && byte !== 0x3d) {
        pushChunk(String.fromCharCode(byte));
        continue;
      }

      if (isSpaceOrTab && !isTrailingWhitespace) {
        pushChunk(String.fromCharCode(byte));
        continue;
      }

      pushChunk(toHex(byte));
    }

    return encoded;
  };

  return input.replace(/\r\n/g, "\n").split("\n").map(encodeLine).join("\r\n");
}

export function validateAndSanitizeEmail(email: string): string {
  if (!email || typeof email !== "string") {
    throw new Error("Email address is required and must be a string");
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(cleanEmail)) {
    throw new Error(`Invalid email address format: ${cleanEmail}`);
  }

  if (cleanEmail.length > 254) {
    throw new Error(`Email address too long: ${cleanEmail}`);
  }

  return cleanEmail;
}

export function encodeSubject(subject: string): string {
  const sanitized = sanitizeText(subject);
  const encoded = Buffer.from(sanitized, "utf8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}
