import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import type { Question, Prediction, Result, NotificationItem } from '../types';
import { Navbar } from '../components/Navbar';
import { Award, Timer, Send, CheckCircle, ShieldAlert, Trophy, Calendar, RefreshCw } from 'lucide-react';

export const UserDashboard: React.FC = () => {
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [predictionHistory, setPredictionHistory] = useState<Prediction[]>([]);
  const [publishedResults, setPublishedResults] = useState<Result[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Timer state for countdown
  const [countdown, setCountdown] = useState<string>('00:00:00');

  const fetchData = async () => {
    try {
      const questionsData = await apiRequest<Question[]>('/questions/active');
      setActiveQuestions(questionsData);
      if (questionsData.length > 0) {
        setSelectedQuestion(questionsData[0]);
      } else {
        setSelectedQuestion(null);
      }

      const historyData = await apiRequest<Prediction[]>('/predictions/');
      setPredictionHistory(historyData);

      const resultsData = await apiRequest<Result[]>('/results/');
      setPublishedResults(resultsData);

      const notificationsData = await apiRequest<NotificationItem[]>('/notifications/');
      setNotifications(notificationsData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (!selectedQuestion) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const deadline = new Date(selectedQuestion.deadline).getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setCountdown('00:00:00');
        clearInterval(interval);
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedQuestion]);

  const handlePredictSubmit = async () => {
    if (!selectedQuestion || !selectedOption) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await apiRequest('/predictions/', {
        method: 'POST',
        body: JSON.stringify({
          question_id: selectedQuestion.id,
          selected_option: selectedOption,
        }),
      });
      setMessage({ text: 'Prediction submitted successfully!', type: 'success' });
      setSelectedOption('');
      // Reload predictions & list
      await fetchData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to submit prediction', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const markAllNotifications = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'POST' });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to parse question options
  const getOptions = (question: Question): string[] => {
    if (Array.isArray(question.options_json)) {
      return question.options_json;
    }
    return [];
  };

  const isNumericQuestion = (question: Question): boolean => {
    return !Array.isArray(question.options_json);
  };

  const getNumericConfig = (question: Question) => {
    if (!Array.isArray(question.options_json)) {
      return question.options_json as { min: number; max: number; step?: number };
    }
    return { min: 0, max: 10 };
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-primary font-headline-md">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-primary" size={48} />
          <span>Loading Elangode Arena...</span>
        </div>
      </div>
    );
  }

  // Check if current question has already been predicted by the user
  const hasPredictedCurrent = predictionHistory.some(p => p.question_id === selectedQuestion?.id);
  const userPredictionForCurrent = predictionHistory.find(p => p.question_id === selectedQuestion?.id);

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Navbar onNotificationClick={() => setShowNotifications(!showNotifications)} unreadCount={unreadCount} />

      {/* Main Content Layout */}
      <main className="pt-24 pb-32 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          
          {/* Prediction Area */}
          <div className="lg:col-span-8 space-y-stack-lg">
            
            {/* Active Questions Selector if multiple */}
            {activeQuestions.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {activeQuestions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setSelectedQuestion(q);
                      setSelectedOption('');
                      setMessage(null);
                    }}
                    className={`px-4 py-2 rounded-full font-label-md text-label-md transition-all border shrink-0 ${
                      selectedQuestion?.id === q.id
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:border-outline'
                    }`}
                  >
                    {q.match_name} - {q.title.substring(0, 20)}...
                  </button>
                ))}
              </div>
            )}

            {selectedQuestion ? (
              <>
                {/* Match Header */}
                <section className="glass-card rounded-xl p-stack-lg overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
                  <div className="flex flex-col items-center justify-center text-center relative z-10">
                    <span className="font-label-md text-label-md text-secondary uppercase tracking-widest mb-2">
                      {selectedQuestion.competition_name}
                    </span>
                    <h2 className="font-headline-md text-headline-md text-on-surface mb-stack-md">
                      {selectedQuestion.match_name}
                    </h2>
                    
                    <div className="inline-flex items-center gap-2 bg-error-container/20 px-6 py-2 rounded-full border border-error/30">
                      <Timer size={18} className="text-error pulse-live" />
                      <span className="font-stats-xl text-stats-xl text-error">{countdown}</span>
                      <span className="font-label-md text-label-md text-on-surface-variant ml-2">Locks in</span>
                    </div>
                  </div>
                </section>

                {/* Prediction Form Canvas */}
                <section className="space-y-stack-md">
                  <h3 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface flex items-center gap-3">
                    <span className="w-2 h-8 bg-primary rounded-full"></span>
                    {selectedQuestion.title}
                  </h3>

                  {message && (
                    <div
                      className={`p-4 rounded-xl text-label-md border flex items-center gap-2 ${
                        message.type === 'success'
                          ? 'bg-tertiary-container/10 border-tertiary/30 text-tertiary'
                          : 'bg-error-container/10 border-error/30 text-error'
                      }`}
                    >
                      {message.type === 'success' ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
                      <span>{message.text}</span>
                    </div>
                  )}

                  {hasPredictedCurrent ? (
                    /* ALREADY SUBMITTED STATE */
                    <div className="glass-card rounded-xl p-8 text-center space-y-4 border-primary/20 bg-primary/5">
                      <Trophy size={48} className="text-secondary mx-auto" />
                      <h4 className="font-headline-md text-headline-md text-primary">Prediction Submitted!</h4>
                      <p className="text-on-surface-variant">
                        You predicted: <span className="text-on-surface font-bold">{userPredictionForCurrent?.selected_option}</span>
                      </p>
                      <p className="text-xs text-outline/70">
                        Submitted on {new Date(userPredictionForCurrent?.submitted_at || '').toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    /* SUBMISSION FORM */
                    <div className="space-y-6">
                      {!isNumericQuestion(selectedQuestion) ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
                          {getOptions(selectedQuestion).map((option) => (
                            <button
                              key={option}
                              onClick={() => setSelectedOption(option)}
                              className={`glass-card rounded-xl p-stack-lg flex flex-col items-center gap-stack-md transition-all ${
                                selectedOption === option ? 'active-selection' : ''
                              }`}
                            >
                              <span className="font-headline-md text-headline-md">{option}</span>
                              <div
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  selectedOption === option ? 'border-primary' : 'border-outline'
                                }`}
                              >
                                <div
                                  className={`w-3 h-3 rounded-full bg-primary transition-opacity ${
                                    selectedOption === option ? 'opacity-100' : 'opacity-0'
                                  }`}
                                ></div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        /* SLIDER / NUMERIC QUESTION */
                        <div className="glass-card rounded-xl p-stack-lg space-y-stack-md">
                          <div className="flex justify-between items-center">
                            <h4 className="font-headline-md text-headline-md">Your Value prediction:</h4>
                            <span className="px-4 py-1 bg-surface-container-highest rounded-full text-secondary font-stats-xl text-stats-xl">
                              {selectedOption || getNumericConfig(selectedQuestion).min}
                            </span>
                          </div>
                          <div className="relative py-4">
                            <input
                              type="range"
                              min={getNumericConfig(selectedQuestion).min}
                              max={getNumericConfig(selectedQuestion).max}
                              step={getNumericConfig(selectedQuestion).step || 1}
                              value={selectedOption || getNumericConfig(selectedQuestion).min}
                              onChange={(e) => setSelectedOption(e.target.value)}
                              className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between mt-2 text-on-surface-variant/50 font-label-md">
                              <span>{getNumericConfig(selectedQuestion).min}</span>
                              <span>{getNumericConfig(selectedQuestion).max}+</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row items-center gap-stack-md pt-4">
                        <button
                          onClick={handlePredictSubmit}
                          disabled={submitting || !selectedOption}
                          className="w-full sm:w-auto px-12 py-4 bg-primary text-on-primary font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {submitting ? 'Submitting...' : 'Submit Prediction'}
                          <Send size={16} />
                        </button>
                        <p className="text-on-surface-variant text-label-md italic">
                          Predict before the deadline. Predictions cannot be modified once submitted.
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              </>
            ) : (
              /* EMPTY ACTIVE STATE */
              <div className="glass-card rounded-xl p-12 text-center space-y-4">
                <Timer size={48} className="text-outline mx-auto" />
                <h3 className="font-headline-lg text-on-surface">No Active Contests</h3>
                <p className="text-on-surface-variant max-w-md mx-auto">
                  There are no active match prediction questions right now. The admin will post new prediction contests soon!
                </p>
              </div>
            )}

            {/* Prediction History Tab */}
            <section className="glass-card rounded-xl p-stack-lg space-y-4">
              <h3 className="font-headline-md text-primary flex items-center gap-2">
                <Calendar size={20} />
                Prediction History
              </h3>
              {predictionHistory.length === 0 ? (
                <p className="text-on-surface-variant text-label-md italic">You haven't submitted any predictions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/20 text-outline text-label-md">
                        <th className="py-3 px-4">Match</th>
                        <th className="py-3 px-4">Question</th>
                        <th className="py-3 px-4">Your Prediction</th>
                        <th className="py-3 px-4">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 text-body-md">
                      {predictionHistory.map((p) => (
                        <tr key={p.id} className="hover:bg-surface-container-highest/20 transition-colors">
                          <td className="py-3 px-4 font-semibold">{p.question?.match_name}</td>
                          <td className="py-3 px-4">{p.question?.title}</td>
                          <td className="py-3 px-4 text-primary font-bold">{p.selected_option}</td>
                          <td className="py-3 px-4 text-on-surface-variant text-xs">
                            {new Date(p.submitted_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-stack-lg">
            
            {/* Notifications panel if toggle open */}
            {showNotifications && (
              <section className="glass-card rounded-xl p-stack-lg border-primary/30 relative animate-fadeIn">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="font-headline-md text-primary">In-App Notifications</h5>
                  {unreadCount > 0 && (
                    <button onClick={markAllNotifications} className="text-xs text-secondary hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-on-surface-variant italic">No notifications.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-lg border text-xs transition-colors ${
                          n.is_read
                            ? 'bg-surface-container-low/30 border-outline-variant/10 text-on-surface-variant'
                            : 'bg-primary/5 border-primary/20 text-on-surface'
                        }`}
                      >
                        <p className="font-bold mb-1">{n.title}</p>
                        <p>{n.message}</p>
                        <span className="text-[10px] text-outline/70 mt-1 block">
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* Published Winners */}
            <section className="glass-card rounded-xl p-stack-lg">
              <h5 className="font-headline-md text-secondary mb-stack-md flex items-center gap-2">
                <Trophy size={20} className="text-secondary" />
                Winner Announcements
              </h5>
              <div className="space-y-stack-md max-h-96 overflow-y-auto pr-1">
                {publishedResults.length === 0 ? (
                  <p className="text-on-surface-variant text-label-md italic">No winner announcements published yet.</p>
                ) : (
                  publishedResults.map((res) => (
                    <div key={res.id} className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/20 space-y-2">
                      <p className="text-xs text-secondary-fixed font-bold uppercase tracking-wider">World Cup Result</p>
                      <h6 className="font-semibold text-label-md text-on-surface">{res.correct_answer} Wins!</h6>
                      <p className="text-xs text-on-surface-variant">
                        Winner Raffle Chosen:{' '}
                        <span className="text-primary font-bold">{res.winner_name || 'No Correct Predictors'}</span>
                      </p>
                      <span className="text-[10px] text-outline/50 block">
                        Published on {new Date(res.published_at || '').toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Platform Rules */}
            <section className="glass-card rounded-xl p-stack-lg">
              <h5 className="font-headline-md text-on-surface mb-stack-md flex items-center gap-2">
                <Award size={20} className="text-primary" />
                Prediction Rules
              </h5>
              <ul className="space-y-stack-md text-label-md text-on-surface-variant">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <p>You can submit only **one** prediction per question contest.</p>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <p>Predictions are locked automatically at the deadline.</p>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <p>Correct prediction earns you **10 points** on the leaderboard.</p>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <p>Raffle winner is selected randomly from correct predictors.</p>
                </li>
              </ul>
            </section>
          </div>

        </div>
      </main>
    </div>
  );
};
