// ============================================================================
// AI Service — OpenAI integration for question generation, explanations, summaries
// Requires human review before publishing (reviewStatus: 'pending')
// ============================================================================

class AIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  /**
   * Generate quiz questions from a topic.
   */
  async generateQuestions(topic, difficulty, count, questionType = 'mcq_single') {
    const prompt = `Generate ${count} ${difficulty} difficulty quiz questions about "${topic}".
Each question should be of type: ${questionType}.
Return as JSON array with this structure:
[{
  "questionText": "...",
  "questionType": "${questionType}",
  "difficulty": "${difficulty}",
  "explanation": "Detailed explanation of the correct answer",
  "options": [
    { "optionText": "...", "isCorrect": true/false },
    { "optionText": "...", "isCorrect": true/false },
    { "optionText": "...", "isCorrect": true/false },
    { "optionText": "...", "isCorrect": true/false }
  ]
}]
Ensure exactly one correct answer for mcq_single. Make distractors plausible but clearly wrong.
Return ONLY valid JSON, no markdown.`;

    return await this._callOpenAI(prompt);
  }

  /**
   * Generate explanations for existing questions.
   */
  async generateExplanations(questions) {
    const questionsText = questions.map(q =>
      `Q: ${q.questionText} (Type: ${q.questionType})`
    ).join('\n');

    const prompt = `For each of the following quiz questions, generate a clear, educational explanation of the correct answer.
Return as JSON array: [{ "questionId": "...", "explanation": "..." }]

Questions:
${questionsText}

Return ONLY valid JSON, no markdown.`;

    return await this._callOpenAI(prompt);
  }

  /**
   * Generate a quiz performance summary (strengths/weaknesses analysis).
   */
  async generateQuizSummary(analytics) {
    const prompt = `Analyze this quiz performance data and provide a summary of student strengths and weaknesses.
Include recommendations for improvement.

Quiz Analytics:
- Total Attempts: ${analytics.totalAttempts}
- Average Score: ${analytics.avgScore}%
- Pass Rate: ${analytics.passRate}%
- Average Time: ${analytics.avgTimeTaken}s

Question Accuracy:
${analytics.questionAccuracy?.map(q =>
  `- "${q.questionText}": ${q.correctPct}% correct, avg ${q.avgTime}s`
).join('\n')}

Return as JSON:
{
  "summary": "Overall performance summary...",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "difficultyAssessment": "easy|appropriate|hard"
}

Return ONLY valid JSON, no markdown.`;

    return await this._callOpenAI(prompt);
  }

  async _callOpenAI(prompt) {
    if (!this.apiKey || this.apiKey === 'sk-your-key-here') {
      // Return mock data for development
      return this._getMockResponse(prompt);
    }

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: this.apiKey });

    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are an expert quiz content creator. Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const content = response.choices[0]?.message?.content || '[]';
    return JSON.parse(content);
  }

  _getMockResponse(prompt) {
    // Mock responses for development without an API key
    if (prompt.includes('Generate') && prompt.includes('quiz questions')) {
      return [
        {
          questionText: 'What is the primary purpose of a load balancer?',
          questionType: 'mcq_single',
          difficulty: 'medium',
          explanation: 'A load balancer distributes incoming network traffic across multiple servers to ensure no single server bears too much load.',
          options: [
            { optionText: 'Distribute traffic across multiple servers', isCorrect: true },
            { optionText: 'Encrypt network traffic', isCorrect: false },
            { optionText: 'Store user sessions', isCorrect: false },
            { optionText: 'Compile source code', isCorrect: false }
          ]
        }
      ];
    }

    if (prompt.includes('explanation')) {
      return [{ questionId: 'mock', explanation: 'This is a mock AI-generated explanation for development.' }];
    }

    return {
      summary: 'Mock analysis: Students show generally good understanding with room for improvement in advanced topics.',
      strengths: ['Basic concepts well understood', 'Good completion rate'],
      weaknesses: ['Advanced topics need more attention', 'Time management could improve'],
      recommendations: ['Add more practice on advanced topics', 'Consider extending time limits'],
      difficultyAssessment: 'appropriate'
    };
  }
}

module.exports = { AIService };
