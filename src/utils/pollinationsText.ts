export async function enhanceScenario(text: string): Promise<string> {
  const body = {
    messages: [
      { role: 'system', content: 'You are a creative writer. Rewrite the scenario to be short, vivid and dramatic.' },
      { role: 'user', content: text }
    ],
    model: 'openai',
    seed: -1
  };
  const res = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Failed to enhance text');
  const data = await res.text();
  const match = data.match(/```([\s\S]*?)```/);
  return match ? match[1] : data;
}
