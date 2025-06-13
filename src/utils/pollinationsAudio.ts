export async function generateTTS(text: string, voice = 'nova'): Promise<string> {
  const encoded = encodeURIComponent(text);
  const url = `https://text.pollinations.ai/${encoded}?model=openai-audio&voice=${voice}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to generate audio');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
