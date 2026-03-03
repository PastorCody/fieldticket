import { retryFetch } from "./retry-fetch";

export async function transcribeWithWhisper(
  audioBuffer: Buffer,
  mimeType: string = "audio/webm"
): Promise<string> {
  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  const uint8 = new Uint8Array(audioBuffer);

  // Factory rebuilds FormData on each retry (streams are consumed after first read)
  function buildBody(): FormData {
    const blob = new Blob([uint8], { type: mimeType });
    const file = new File([blob], `audio.${ext}`, { type: mimeType });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-1");
    formData.append("language", "en");
    formData.append(
      "prompt",
      "This is a field worker describing an oilfield job. Common terms: well, lease, pump jack, rod pump, tubing, casing, pulling unit, hot oil, roustabout, workover, frac, wellhead, separator, tank battery, packer."
    );
    return formData;
  }

  const response = await retryFetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: buildBody(),
      bodyFactory: buildBody,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.text;
}
