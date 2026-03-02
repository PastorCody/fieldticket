import type { StructuredTicket, AIQuestion, PricingData } from "@/types";

/* ── Q&A Answer Processing ─────────────────────────────── */

const QA_SYSTEM_PROMPT = `You are a field ticket assistant. A worker is answering a specific clarifying question about their oilfield job. Extract the relevant field value(s) from their answer.

Return ONLY valid JSON in this format:
{
  "fieldUpdates": { "field_name": "extracted_value" },
  "confidence": "high" | "medium" | "low"
}

Rules:
- Only update the specific field(s) relevant to the question being answered.
- Valid field names: job_date, job_type, well_name, lease_name, operator, location, hours_worked, start_time, end_time, equipment_used, materials_used, work_description, safety_notes, additional_notes, pricing_notes
- For hours_worked, return a number.
- For equipment_used, return an array of strings.
- For materials_used, return an array of {item, quantity, unit} objects.
- For all other fields, return a string.
- If the answer is unclear or doesn't provide usable data, return empty fieldUpdates and "low" confidence.
- Return ONLY JSON. No markdown, no explanation.`;

export async function processQAAnswer(
  answer: string,
  field: string,
  question: string,
  currentFields: StructuredTicket
): Promise<{
  fieldUpdates: Record<string, unknown>;
  confidence: "high" | "medium" | "low";
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
      max_tokens: 512,
      system: QA_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Question asked: "${question}"
Target field: ${field}

Current field values for context:
${JSON.stringify(currentFields, null, 2)}

Worker's answer: "${answer}"`,
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

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { fieldUpdates: {}, confidence: "low" };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    fieldUpdates: parsed.fieldUpdates || {},
    confidence: parsed.confidence || "medium",
  };
}

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
  "pricing": {
    "rate_type": "day | hourly | flat | none",
    "day_rate": 0,
    "hourly_rate": 0,
    "flat_rate": 0,
    "line_items": [{"description": "string", "quantity": 0, "unit_price": 0}],
    "notes": "string (PO numbers, AFE numbers, billing references)"
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
- For pricing: extract day rate, hourly rate, flat rate, or individual cost line items if mentioned (e.g., "2 loads of sand at $500 each"). Extract PO numbers or AFE numbers into pricing.notes. If no pricing is mentioned, set rate_type to "none" and omit other pricing fields.
- Return ONLY valid JSON. No markdown, no explanation.`;

export async function structureTranscript(transcript: string): Promise<{
  ticket: StructuredTicket;
  questions: AIQuestion[];
  pricing?: PricingData;
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

  // Build pricing data if AI extracted any
  let pricing: PricingData | undefined;
  if (parsed.pricing && parsed.pricing.rate_type !== "none") {
    pricing = {
      rate_type: parsed.pricing.rate_type || "none",
      day_rate: parsed.pricing.day_rate || undefined,
      hourly_rate: parsed.pricing.hourly_rate || undefined,
      flat_rate: parsed.pricing.flat_rate || undefined,
      line_items: (parsed.pricing.line_items || []).map(
        (li: { description: string; quantity: number; unit_price: number }) => ({
          id: crypto.randomUUID(),
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          total: li.quantity * li.unit_price,
        })
      ),
      notes: parsed.pricing.notes || undefined,
    };
  }

  return {
    ticket: parsed.ticket,
    questions: parsed.questions || [],
    pricing,
  };
}
