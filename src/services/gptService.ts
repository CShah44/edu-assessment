import {
  Question,
  UserContext,
  ExploreResponse,
  Topic,
  StreamQuestion,
  // StreamContent,
} from "../types";
import {
  GoogleGenerativeAI,
  GenerativeModel,
  SchemaType,
  ResponseSchema,
} from "@google/generative-ai";

export class GPTService {
  private model: GenerativeModel;

  constructor() {
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  }

  private async makeRequest(
    systemPrompt: string,
    userPrompt: string,
    schema?: ResponseSchema
  ) {
    try {
      const prompt = `${systemPrompt}\n\nUser Query: ${userPrompt}\n\nProvide your response in JSON format.`;

      if (schema) {
        const result = await this.model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        });

        return result.response.text();
      }

      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
        },
      });

      return result.response.text();
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error("Failed to generate content");
    }
  }

  async getExploreContent(
    query: string,
    userContext: UserContext
  ): Promise<ExploreResponse> {
    try {
      // Using the exact same system prompt from original code
      const systemPrompt = `You are a Gen-Z tutor who explains complex topics concisely considering you are teaching someone with a low IQ.
        First, identify the domain of the topic from these categories:
        - SCIENCE: Physics, Chemistry, Biology
        - MATHEMATICS: Algebra, Calculus, Geometry
        - TECHNOLOGY: Computer Science, AI, Robotics
        - MEDICAL: Anatomy, Healthcare, Medicine
        - HISTORY: World History, Civilizations
        - BUSINESS: Economics, Finance, Marketing
        - LAW: Legal Systems, Rights
        - PSYCHOLOGY: Human Behavior, Development
        - CURRENT_AFFAIRS: Global Events, Politics
        - GENERAL: Any other topic`;

      const userPrompt = `Explain "${query}" in approximately three 20-30 word paragraphs:
        1. Basic definition without using words like imagine
        2. more details
        3. Real-world application examples without using the word real world application
        Make it engaging for someone aged ${userContext.age}.`;

      const content = await this.makeRequest(systemPrompt, userPrompt);
      const parsedContent = JSON.parse(content);

      return {
        content: [
          parsedContent.content.paragraph1,
          parsedContent.content.paragraph2,
          parsedContent.content.paragraph3,
        ].join("\n\n"),
        relatedTopics: parsedContent.relatedTopics.map((topic: Topic) => ({
          topic: topic.name,
          type: topic.type,
          reason: topic.reason,
        })),
        relatedQuestions: parsedContent.relatedQuestions.map(
          (q: StreamQuestion) => ({
            question: q.text,
            type: q.type,
            context: q.context,
          })
        ),
      };
    } catch (error) {
      console.error("Explore content error:", error);
      throw new Error("Failed to generate explore content");
    }
  }

  async streamExploreContent(
    query: string,
    userContext: UserContext,
    onChunk: (content: {
      text?: string;
      topics?: Topic[];
      questions?: Question[] | StreamQuestion[];
    }) => void
  ): Promise<void> {
    try {
      const stream = await this.model.generateContentStream({
        contents: [
          {
            role: "user",
            parts: [{ text: this.buildPrompt(query) }],
          },
        ],
        generationConfig: {
          temperature: 0.9,
        },
      });

      let mainContent = "";
      let currentTopics: Topic[] = [];
      let currentQuestions: Question[] | StreamQuestion[] | undefined = [];

      for await (const chunk of stream.stream) {
        const chunkText = chunk.text();
        mainContent += chunkText;

        try {
          if (mainContent.includes("}")) {
            const jsonStr = mainContent.substring(
              mainContent.indexOf("{"),
              mainContent.lastIndexOf("}") + 1
            );
            const parsed = JSON.parse(jsonStr);

            if (parsed.topics) {
              currentTopics = parsed.topics.map((t: Topic) => ({
                topic: t.name,
                type: t.type,
                reason: t.reason,
              }));
            }

            if (parsed.questions) {
              currentQuestions = parsed.questions.map((q: StreamQuestion) => ({
                question: q.text,
                type: q.type,
                context: q.context,
              }));
            }
          }
        } catch (e) {
          // Continue accumulating if JSON is incomplete
          console.error("Error parsing JSON:", e);
        }

        onChunk({
          text: mainContent.split("---")[0]?.trim(),
          topics: currentTopics,
          questions: currentQuestions,
        });
      }
    } catch (error) {
      console.error("Stream error:", error);
      throw new Error("Failed to stream content");
    }
  }

  async getPlaygroundQuestion(
    topic: string,
    level: number,
    userContext: UserContext
  ): Promise<Question[]> {
    const aspects = [
      "core_concepts",
      "applications",
      "problem_solving",
      "analysis",
      "current_trends",
    ];
    const selectedAspect = aspects[Math.floor(Math.random() * aspects.length)];

    const systemPrompt = `Generate 5 UNIQUE multiple-choice question about ${topic}.
        Focus on: ${selectedAspect.replace("_", " ")}
        The question should in a certain JSON format which is provided.
        `;

    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        questions: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              text: { type: SchemaType.STRING },
              options: {
                type: SchemaType.OBJECT,
                properties: {
                  A: { type: SchemaType.STRING },
                  B: { type: SchemaType.STRING },
                  C: { type: SchemaType.STRING },
                  D: { type: SchemaType.STRING },
                },
              },
              correctAnswer: { type: SchemaType.STRING },
              explanation: {
                type: SchemaType.OBJECT,
                properties: {
                  correct: { type: SchemaType.STRING },
                  key_point: { type: SchemaType.STRING },
                },
              },
              subtopic: { type: SchemaType.STRING },
            },
          },
        },
      },
    };

    const content = await this.makeRequest(systemPrompt, topic, schema);
    const cleanedContent = content.trim();

    // Extract the JSON part
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }

    const jsonString = jsonMatch[0];

    // Parse the JSON
    const parsedContent = JSON.parse(jsonString);

    // Transform each question in the array
    const questions = parsedContent.questions.map((q) => {
      const question: Question = {
        text: q.text,
        options: Object.values(q.options),
        correctAnswer:
          q.correctAnswer === "A"
            ? 0
            : q.correctAnswer === "B"
            ? 1
            : q.correctAnswer === "C"
            ? 2
            : 3, // Convert A,B,C,D to 0,1,2,3
        explanation: {
          correct: q.explanation.correct,
          key_point: q.explanation.key_point,
        },
        difficulty: level,
        topic: topic,
        subtopic: q.subtopic || topic,
        questionType: "conceptual",
        ageGroup: userContext.age.toString(),
      };
      console.log(question);
      console.log("--------------------------------------");
      return this.shuffleOptionsAndAnswer(question);
    });

    return questions;
  }

  private shuffleOptionsAndAnswer(question: Question): Question {
    const optionsWithIndex = question.options.map((opt, idx) => ({
      text: opt,
      isCorrect: idx === question.correctAnswer,
    }));

    for (let i = optionsWithIndex.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [optionsWithIndex[i], optionsWithIndex[j]] = [
        optionsWithIndex[j],
        optionsWithIndex[i],
      ];
    }

    return {
      ...question,
      options: optionsWithIndex.map((opt) => opt.text),
      correctAnswer: optionsWithIndex.findIndex((opt) => opt.isCorrect),
    };
  }

  private buildPrompt = (query: string): string => {
    // Keep original buildPrompt implementation
    return `Explain "${query}" using current social media trends, memes, and pop culture references.`;
  };
}

export const gptService = new GPTService();
