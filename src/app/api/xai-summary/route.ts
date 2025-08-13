import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { logs } = await req.json();
    if (!logs || !Array.isArray(logs)) {
      return NextResponse.json({ error: 'Invalid logs data' }, { status: 400 });
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'XAI API key not configured' }, { status: 500 });
    }

    // Prepare the prompt for XAI
    const prompt = `Given the following training logs, provide a concise summary and a recommendation for future training.\n\nLogs:\n${JSON.stringify(logs, null, 2)}`;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          {
            role: 'system',
            content:
              'Create a short training summary and recommendation based on the training logs. Be concise and to the point. Do not include any other text than the summary and recommendation. Do not divide paragraph by **Summary** or **Recommendation**, just one conscise paragraph.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: 'XAI API error', details: errorText }, { status: 500 });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || 'No summary available.';
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}
