export interface ImageGenResult {
  url: string;
  model: string;
}

export async function generateImage(
  prompt: string,
  model: string = 'flux'
): Promise<ImageGenResult> {
  // Pollinations free image generation — no API key needed, always works
  const seed = Math.floor(Math.random() * 1000000);
  const modelParam = model === 'sdxl' ? 'sdxl' : 'flux';
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&model=${modelParam}&nologo=true`;

  return { url, model: `pollinations-${modelParam}` };
}

export const IMAGE_MODELS = [
  { id: 'flux', label: 'Flux (Free)', desc: 'Fast, high-quality, open-source' },
  { id: 'sdxl', label: 'Stable Diffusion XL', desc: 'Photorealistic, detailed' },
];
