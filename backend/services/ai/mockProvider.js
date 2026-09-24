/**
 * MockProvider — deterministic AI provider for offline testing and development.
 *
 * Never makes external API calls. Produces clear, predictable mock output
 * to verify AI infrastructure, controllers, and services.
 */

export class MockProvider {
  constructor(options = {}) {
    this.name = 'mock';
    this.model = options.model || 'mock-model';
  }

  /**
   * Generate mock AI output deterministically.
   *
   * @param {Object} params
   * @param {string} params.prompt — Input prompt
   * @param {string} [params.systemInstruction] — Optional system instructions
   * @param {number} [params.temperature] — Optional temperature
   * @param {number} [params.maxOutputTokens] — Optional max tokens
   * @param {boolean} [params.returnJson=false] — Return formatted mock JSON
   * @returns {Promise<{ text: string, provider: string, model: string, generatedAt: string }>}
   */
  async generate({ prompt, systemInstruction, returnJson = false }) {
    const timestamp = new Date().toISOString();

    let text;
    if (returnJson) {
      const isChatRequest =
        String(prompt || '').toLowerCase().includes('habit-data assistant') ||
        String(systemInstruction || '').toLowerCase().includes('habit-data assistant') ||
        String(prompt || '').toLowerCase().includes('user question');

      const isRecoveryRequest =
        String(prompt || '').toLowerCase().includes('recovery') ||
        String(systemInstruction || '').toLowerCase().includes('recovery coach');

      const isSuggestionRequest =
        String(prompt || '').toLowerCase().includes('suggestion') ||
        String(systemInstruction || '').toLowerCase().includes('habit-design');

      const isMorningRequest =
        String(prompt || '').toLowerCase().includes('morning motivation') ||
        String(systemInstruction || '').toLowerCase().includes('supportive habit-tracking coach') ||
        String(prompt || '').toLowerCase().includes('available habits for focus');

      if (isChatRequest) {
        const pLower = String(prompt || '').toLowerCase();
        let answer =
          '[MOCK] You have recorded consistent check-ins across your active habits with strong weekly momentum.';
        let dataPoints = ['Active habit routines tracked', 'Steady weekly momentum'];

        const hasNoHabits =
          pLower.includes('"activehabitcount": 0') ||
          pLower.includes('activehabitcount: 0') ||
          pLower.includes('active habits: 0') ||
          pLower.includes('"habits": []') ||
          pLower.includes('no habits tracked');

        if (pLower.includes('weather') || pLower.includes('python') || pLower.includes('news') || pLower.includes('politic')) {
          answer =
            "I can help analyze your habit data, but I can't answer that question from the information available here.";
          dataPoints = [];
        } else if (pLower.includes('medic') || pLower.includes('diagnos') || pLower.includes('health condition') || pLower.includes('disorder')) {
          answer =
            "I can describe the habit-tracking pattern in your data, but I can't determine a medical condition.";
          dataPoints = [];
        } else if (hasNoHabits) {
          answer =
            "You don't have any active habits tracked yet. Once you create and check off habits, I'll be able to analyze your trends.";
          dataPoints = [];
        } else if (pLower.includes('strongest') || pLower.includes('best habit')) {
          answer = '[MOCK] Your strongest habit recently has been Morning Reading with a high completion rate.';
          dataPoints = ['82% completion rate over the last 30 days', 'Current streak: 6 days'];
        } else if (pLower.includes('struggl') || pLower.includes('focus') || pLower.includes('attention')) {
          answer = '[MOCK] Based on your data, Evening Journaling has the lowest completion rate and could use some focus.';
          dataPoints = ['35% completion rate', 'Current streak: 0 days'];
        } else if (pLower.includes('best day')) {
          answer = '[MOCK] Your most consistent day of the week is Wednesday with the highest number of recorded completions.';
          dataPoints = ['Highest check-in count on Wednesdays', 'Consistent midweek momentum'];
        } else if (pLower.includes('longest streak') || pLower.includes('streak')) {
          answer = '[MOCK] Your longest streak is 14 days, achieved with your Morning Workout habit.';
          dataPoints = ['14-day record streak', 'Active habit status'];
        }

        text = JSON.stringify({
          answer,
          dataPoints,
          mock: true,
          generatedAt: timestamp,
        });
      } else if (isRecoveryRequest) {
        text = JSON.stringify({
          headline: '[MOCK] Reset and Restart',
          acknowledgement:
            "You previously built a strong streak with this habit. Missing a day is completely normal and doesn't erase the momentum you established.",
          recoverySteps: [
            "Scale down today's session to just 5 minutes or 1 small action.",
            'Schedule your completion time right after a reliable daily trigger.',
            'Focus on simply checking in today without pressure for perfection.',
          ],
          firstStep: 'Complete 1 micro-version of this habit today to rekindle your momentum.',
          mock: true,
          generatedAt: timestamp,
        });
      } else if (isSuggestionRequest) {
        text = JSON.stringify({
          suggestions: [
            {
              name: 'Morning Hydration Kickstart',
              description: 'Drink a full glass of water right after waking up to activate your body.',
              category: 'health',
              frequency: 'daily',
              targetDays: 1,
              icon: '💧',
              color: '#14b8a6',
              reason: 'Directly fits your morning peak focus and requires minimal friction to overcome consistency drops.',
            },
            {
              name: 'Focused 25-Min Study Sprint',
              description: 'Dedicate a distraction-free 25-minute block to learning with your phone out of sight.',
              category: 'learning',
              frequency: 'daily',
              targetDays: 1,
              icon: '📚',
              color: '#3b82f6',
              reason: 'Leverages high energy while keeping the commitment short to eliminate low motivation barriers.',
            },
            {
              name: 'Evening Unwind & Planning',
              description: "Review your top 3 wins and plan tomorrow's priority task before bed.",
              category: 'mindfulness',
              frequency: 'weekly',
              targetDays: 5,
              icon: '🧘',
              color: '#8b5cf6',
              reason: "Clarifies tomorrow's priorities so you never wake up feeling scattered or unfocused.",
            },
          ],
          mock: true,
          generatedAt: timestamp,
        });
      } else if (isMorningRequest) {
        const pLower = String(prompt || '').toLowerCase();
        let focusHabit = null;

        // Try extracting first available habit from prompt
        const match = prompt.match(/\*\s*"([^"]+)"/);
        if (match && match[1]) {
          focusHabit = match[1].trim();
        }

        const isZeroHabits =
          pLower.includes('scheduled: 0') ||
          pLower.includes('0 of 0 completed') ||
          pLower.includes('available habits for focus:\n\n') ||
          !focusHabit;

        const message = isZeroHabits
          ? "Start with one small habit today, and we'll build from there."
          : `[MOCK] Keep your momentum going today! A focused check-in on ${focusHabit} will set a strong tone for the day.`;

        text = JSON.stringify({
          message,
          focusHabit: isZeroHabits ? null : focusHabit,
          mock: true,
          generatedAt: timestamp,
        });
      } else {
        text = JSON.stringify({
          headline: '[MOCK] Solid Weekly Routine Consistency',
          summary: 'You maintained encouraging consistency across your scheduled habits this week. Key routines showed steady discipline with clear positive momentum.',
          wins: [
            'High check-in rate on core scheduled days',
            'Maintained active streak momentum',
          ],
          focusAreas: [
            'Protect scheduled evening routines on busy weekdays',
          ],
          recommendation: 'Anchor your habits to an existing daily trigger to ensure consistent completions.',
          mock: true,
          generatedAt: timestamp,
        });
      }
    } else {
      const cleanPrompt = String(prompt || '').trim();
      const promptSnippet = cleanPrompt.length > 40 ? cleanPrompt.slice(0, 40) + '...' : cleanPrompt;
      text = `[MOCK AI] Deterministic response for prompt: "${promptSnippet}"`;
    }

    return {
      text,
      provider: this.name,
      model: this.model,
      generatedAt: timestamp,
    };
  }
}
