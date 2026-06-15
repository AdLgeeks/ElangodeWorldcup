export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
  points: number;
  created_at: string;
}

export interface Question {
  id: number;
  title: string;
  description?: string;
  match_name: string;
  competition_name: string;
  options_json: string[] | { min: number; max: number; step?: number };
  deadline: string;
  status: 'draft' | 'active' | 'locked' | 'completed' | 'published';
  created_by: number;
  created_at: string;
}

export interface Prediction {
  id: number;
  user_id: number;
  question_id: number;
  selected_option: string;
  submitted_at: string;
  question?: Question;
}

export interface Result {
  id: number;
  question_id: number;
  correct_answer: string;
  winner_user_id?: number;
  winner_name?: string;
  approved: boolean;
  approved_at?: string;
  published_at?: string;
}

export interface WinnerPreview {
  question_id: number;
  correct_answer: string;
  eligible_users_count: number;
  winner?: User;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface LeaderboardRow {
  rank: number;
  user_id: number;
  full_name: string;
  total_points: number;
  correct_predictions: number;
  total_predictions: number;
  win_percentage: number;
}

export interface Leaderboard {
  timeframe: 'weekly' | 'monthly' | 'overall';
  rankings: LeaderboardRow[];
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  active_questions: number;
  locked_questions: number;
  total_predictions: number;
  total_winners: number;
  participation_rate: number;
  prediction_accuracy: number;
  charts: {
    dailyParticipation: ChartPoint[];
    userGrowth: ChartPoint[];
    predictionDistribution: ChartPoint[];
    monthlyActivity: ChartPoint[];
  };
}
