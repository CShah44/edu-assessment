// src/services/storageService.ts

interface UserInfo {
  age: number;
  location: string;
  studyingFor: string;
}

interface TestResult {
  topic: string;
  examType: "JEE" | "NEET";
  score: number;
  predictedRank: number;
  date: string;
}

interface UserProgress {
  level: number;
  streak: number;
  bestStreak: number;
  totalQuestions: number;
  correctAnswers: number;
  testResults: TestResult[];
  lastActive: string;
}

class StorageService {
  private readonly USER_INFO_KEY = "edu_ai_user_info";
  private readonly PROGRESS_KEY = "edu_ai_progress";
  private readonly HISTORY_KEY = "edu_ai_history";
  private readonly USER_ID_KEY = "edu_ai_user_id";

  constructor() {
    // Initialize if needed
  }

  getUserId(): string {
    let userId = localStorage.getItem(this.USER_ID_KEY);
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem(this.USER_ID_KEY, userId);
    }
    return userId;
  }

  // User Info Methods
  saveUserInfo(info: UserInfo): void {
    const userId = this.getUserId();
    const userInfoWithId = {
      ...info,
      userId,
    };
    localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfoWithId));
  }

  getUserInfo(): UserInfo | null {
    const data = localStorage.getItem(this.USER_INFO_KEY);
    return data ? JSON.parse(data) : null;
  }

  hasUser(): boolean {
    return !!this.getUserInfo();
  }

  // Progress Methods
  saveProgress(progress: UserProgress): void {
    localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progress));
  }

  getProgress(): UserProgress {
    const data = localStorage.getItem(this.PROGRESS_KEY);
    return data
      ? JSON.parse(data)
      : {
          level: 1,
          streak: 0,
          bestStreak: 0,
          totalQuestions: 0,
          correctAnswers: 0,
          testResults: [],
          lastActive: new Date().toISOString(),
        };
  }

  updateProgress(updates: Partial<UserProgress>): void {
    const current = this.getProgress();
    this.saveProgress({ ...current, ...updates });
  }

  // Test Result Methods
  addTestResult(result: TestResult): void {
    const progress = this.getProgress();
    progress.testResults.push(result);
    this.saveProgress(progress);
  }

  getTestResults(): TestResult[] {
    return this.getProgress().testResults;
  }

  // History Methods
  addToHistory(topic: string): void {
    const history = this.getHistory();
    history.unshift({
      topic,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 50 items
    if (history.length > 50) {
      history.pop();
    }

    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
  }

  getHistory(): Array<{ topic: string; timestamp: string }> {
    const data = localStorage.getItem(this.HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  }

  // Utility Methods
  clearAll(): void {
    localStorage.removeItem(this.USER_INFO_KEY);
    localStorage.removeItem(this.PROGRESS_KEY);
    localStorage.removeItem(this.HISTORY_KEY);
  }
}

// Create and export a single instance
export const storageService = new StorageService();
export default storageService;
