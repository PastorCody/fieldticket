import type { StructuredTicket, AIQuestion } from "@/types";

const SYSTEM_PROMPT = `You are a field ticket assistant for oilfield workers. Given a voice transcript of a worker describing their job, extract structured data into this exact JSON format:

{
  "ticket": {
    "job_date": "YYYY-MM-DD (use today if not mentioned)",
    "job_type": "string (e.g., Pump Repair, Well Service, Roustabout, Hot Oil, Wireline, Workover, Frac, Hauling, etc.)",
    "well_name": "string (the well or pad name)",
    "lease_name": "string (the lease name if mentioned)",
    "operator": "string (the company operating the well/lease)",
    "location": "string (county, section, township, range, or GPS description)",
    "hours_worked": 0,
    "start_time": "HH:MM or empty string",
    "end_time": "HH:MM or empty string",
    "equipment_used": ["list of equipment/tools mentioned"],
    "materials_used": [{"item": "string", "quantity": 0, "unit": "string"}],
    "work_description": "string (detailed narrative of work performed)",
    "safety_notes": "string (any safety observations, JSA items, or incidents mentioned)",
    "additional_notes": "string (anything else relevant)"
  },
  "questions": [
    {"field": "field_name", "question": "Clarifying question text"}
  ]
}

Rules:
- If a field is not mentioned, use an empty string or empty array — never guess.
- Always include clarifying questions for any ambiguous or missing critical fields (well_name, hours, job_type at minimum).
- Keep work_description as a professional narrative, not verbatim transcript.
- For materials_used, extract quantities and units when possible. If only item is mentioned, set quantity to 1 and unit to "ea".
- For hours_worked, if start/end times are given, calculate the total. If "per person" vs "total" is unclear, ask.
- Return ONLY valid JSON. No markdown, no explanation.`;

export async function structureTranscript(transcript: string): Promise<{
  ticket: StructuredTicket;
  questions: AIQuestion[];
}> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Transcript:\n\n${transcript}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text || "";

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude did not return valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    ticket: parsed.ticket,
    questions: parsed.questions || [],
  };
}
