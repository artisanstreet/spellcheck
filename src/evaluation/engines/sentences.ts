export const sentences = (text: string) =>
  Array.from(text.matchAll(/[^.!?\n]+(?:[.!?]+|(?=\n)|$)/g), (match) => {
    const content = match[0].trim();
    return { content, start: match.index + match[0].indexOf(content) };
  }).filter((sentence) => sentence.content !== "");
