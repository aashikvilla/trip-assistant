/**
 * Analyses an audio Blob and returns an array of normalised amplitude values.
 * Uses Web Audio API OfflineAudioContext to decode and sample the audio.
 *
 * @param blob  - The audio Blob to analyse
 * @param bars  - Number of amplitude samples to produce (default: 40)
 * @returns     - Array of `bars` normalised values in [0, 1], or [] if unavailable
 */
export async function analyseWaveform(blob: Blob, bars = 40): Promise<number[]> {
  if (typeof window === 'undefined' || !window.OfflineAudioContext) {
    return [];
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    // Create a temporary AudioContext just to decode
    const decodeCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
    await decodeCtx.close();

    // Use the first channel's raw PCM data
    const rawData = audioBuffer.getChannelData(0);
    const samplesPerBar = Math.floor(rawData.length / bars);
    const amplitudes: number[] = [];

    for (let i = 0; i < bars; i++) {
      const start = i * samplesPerBar;
      const end = start + samplesPerBar;
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += rawData[j] * rawData[j]; // squared for RMS
      }
      amplitudes.push(Math.sqrt(sum / samplesPerBar));
    }

    // Normalise to [0, 1]
    const max = Math.max(...amplitudes, 1e-8);
    return amplitudes.map(v => v / max);
  } catch {
    return [];
  }
}
