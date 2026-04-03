const { OpenAI } = require('openai');

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const scoreTourism = async ({ description, state }) => {
  if (!client) return null;
  const prompt = `Analyze the following post and give a tourism relevance score between 0 and 100 based on how useful or attractive it is for travelers. Only return a number.\n\nPost:\n${description}\n\nLocation: ${state || 'Unknown'}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Return only a number between 0 and 100.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
  });

  const content = response.choices?.[0]?.message?.content || '';
  const match = content.match(/\d+/);
  if (!match) return null;
  const score = Math.max(0, Math.min(100, Number(match[0])));
  return Number.isFinite(score) ? score : null;
};

module.exports = { scoreTourism };
