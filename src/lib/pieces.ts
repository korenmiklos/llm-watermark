// Display form for tokenizer pieces. Token identity (what the PRF hashes)
// stays the raw piece string; only rendering goes through this.

const BYTE_PIECE = /^<0x([0-9A-Fa-f]{2})>$/;

export function prettyToken(text: string): string {
  const byte = BYTE_PIECE.exec(text);
  if (byte) return String.fromCharCode(parseInt(byte[1], 16));
  // SentencePiece word boundary, GPT-2 byte-level space and newline.
  return text.replace(/▁/g, ' ').replace(/Ġ/g, ' ').replace(/Ċ/g, '\n');
}
