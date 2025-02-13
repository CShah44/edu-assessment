// src/services/api.ts
import { Question, UserContext, ExploreResponse } from "../types";
import { GPTService } from "./gptService";

class RateLimiter {
  private minuteLimit: number = 15;
  private hourLimit: number = 250;
  private dayLimit: number = 500;

  private minuteRequests: number;
  private hourRequests: number;
  private dayRequests: number;

  private lastMinute: number;
  private lastHour: number;
  private lastDay: number;

  constructor() {
    // Initialize from localStorage or use defaults
    this.minuteRequests = parseInt(
      localStorage.getItem("minuteRequests") || "0"
    );
    this.hourRequests = parseInt(localStorage.getItem("hourRequests") || "0");
    this.dayRequests = parseInt(localStorage.getItem("dayRequests") || "0");
    this.lastMinute = parseInt(
      localStorage.getItem("lastMinute") || Date.now().toString()
    );
    this.lastHour = parseInt(
      localStorage.getItem("lastHour") || Date.now().toString()
    );
    this.lastDay = parseInt(
      localStorage.getItem("lastDay") || Date.now().toString()
    );
  }

  private saveToStorage(): void {
    localStorage.setItem("minuteRequests", this.minuteRequests.toString());
    localStorage.setItem("hourRequests", this.hourRequests.toString());
    localStorage.setItem("dayRequests", this.dayRequests.toString());
    localStorage.setItem("lastMinute", this.lastMinute.toString());
    localStorage.setItem("lastHour", this.lastHour.toString());
    localStorage.setItem("lastDay", this.lastDay.toString());
  }

  checkLimit(): boolean {
    const now = Date.now();

    if (now - this.lastMinute > 60000) {
      this.minuteRequests = 0;
      this.lastMinute = now;
    }
    if (now - this.lastHour > 3600000) {
      this.hourRequests = 0;
      this.lastHour = now;
    }
    if (now - this.lastDay > 86400000) {
      this.dayRequests = 0;
      this.lastDay = now;
    }

    if (
      this.minuteRequests >= this.minuteLimit ||
      this.hourRequests >= this.hourLimit ||
      this.dayRequests >= this.dayLimit
    ) {
      return false;
    }

    this.minuteRequests++;
    this.hourRequests++;
    this.dayRequests++;

    this.saveToStorage();
    return true;
  }
}

const rateLimiter = new RateLimiter();

const gptService = new GPTService();

const transformQuestion = (rawQuestion: Question): Question => ({
  text: rawQuestion.text,
  options: rawQuestion.options,
  correctAnswer: rawQuestion.correctAnswer,
  explanation: rawQuestion.explanation,
  difficulty: rawQuestion.difficulty,
  ageGroup: rawQuestion.ageGroup,
  topic: rawQuestion.topic,
  subtopic: rawQuestion.subtopic || "",
  questionType: rawQuestion.questionType || "conceptual",
});

export const api = {
  async getQuestion(
    topic: string,
    level: number,
    userContext: UserContext
  ): Promise<Question[]> {
    if (!rateLimiter.checkLimit()) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    try {
      const questions = await gptService.getPlaygroundQuestion(
        topic,
        level,
        userContext
      );

      const transformedQuestions = questions.map((q: Question) =>
        transformQuestion(q)
      );
      // console.log(transformedQuestions);
      return transformedQuestions;
    } catch (error) {
      console.error("Question generation error:", error);
      throw new Error("Failed to generate question");
    }
  },

  async explore(
    query: string,
    userContext: UserContext
  ): Promise<ExploreResponse> {
    if (!rateLimiter.checkLimit()) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    try {
      const response = await gptService.getExploreContent(query, userContext);
      return response;
    } catch (error) {
      console.error("Explore error:", error);
      throw new Error("Failed to explore topic");
    }
  },
};
