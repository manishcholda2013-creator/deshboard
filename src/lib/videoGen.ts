export interface VideoGenResult {
  url: string;
  model: string;
}

export async function generateVideo(prompt: string): Promise<VideoGenResult> {
  // Pollinations cinematic frame generation — free, no key needed
  const seed = Math.floor(Math.random() * 1000000);
  const enhancedPrompt = `cinematic film still, high detail, professional cinematography, dramatic lighting: ${prompt}`;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1280&height=720&seed=${seed}&model=flux&nologo=true`;

  return { url, model: 'pollinations-cinema' };
}

export const VIDEO_MODELS = [
  { id: 'pollinations', label: 'Pollinations Cinema (Free)', desc: 'Open-source text-to-video cinematic frames' },
];
