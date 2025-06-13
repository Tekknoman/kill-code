export function getTTSUrl(text: string, voice = 'nova'): string {
  const encoded = encodeURIComponent(text);
  return `https://text.pollinations.ai/${encoded}?model=openai-audio&voice=${voice}`;
}

export async function generateTTS(text: string, voice = 'nova'): Promise<string> {
  return getTTSUrl(text, voice);
}
