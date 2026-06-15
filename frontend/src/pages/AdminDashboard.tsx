import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import type { Question, User, AdminStats, Result, WinnerPreview } from '../types';
import { Navbar } from '../components/Navbar';
import { ShieldCheck, Plus, Play, Lock, Edit2, Trash2, Award, Users, FileText, CheckCircle, AlertCircle, RefreshCw, BarChart2, Check } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'questions' | 'users'>('stats');
  
  // States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Question Creation Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formMatchName, setFormMatchName] = useState('');
  const [formCompName, setFormCompName] = useState('');
  const [formType, setFormType] = useState<'options' | 'slider'>('options');
  const [formOptions, setFormOptions] = useState(''); // Comma separated
  const [formSliderMin, setFormSliderMin] = useState(0);
  const [formSliderMax, setFormSliderMax] = useState(10);
  const [formDeadline, setFormDeadline] = useState('');

  // Result Processing State
  const [processingQuestion, setProcessingQuestion] = useState<Question | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [winnerPreview, setWinnerPreview] = useState<WinnerPreview | null>(null);
  const [draftResult, setDraftResult] = useState<Result | null>(null);
  const [processingLoading, setProcessingLoading] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const statsData = await apiRequest<AdminStats>('/users/analytics');
      setStats(statsData);

      const questionsData = await apiRequest<Question[]>('/questions/');
      setQuestions(questionsData);

      const usersData = await apiRequest<User[]>('/users/');
      setUsers(usersData);
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch administration data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCreateOrUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    // Format options
    let options: string[] | { min: number; max: number } = [];
    if (formType === 'options') {
      options = formOptions.split(',').map((o) => o.trim()).filter((o) => o.length > 0);
      if (options.length < 2) {
        setActionError('Please provide at least 2 comma-separated options.');
        return;
      }
    } else {
      options = { min: Number(formSliderMin), max: Number(formSliderMax) };
    }

    try {
      if (editingQuestion) {
        // Update Question
        await apiRequest(`/questions/${editingQuestion.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: formTitle,
            description: formDesc,
            match_name: formMatchName,
            competition_name: formCompName,
            options_json: options,
            deadline: new Date(formDeadline).toISOString(),
          }),
        });
        setActionSuccess('Question updated successfully.');
      } else {
        // Create Draft Question
        await apiRequest('/questions/', {
          method: 'POST',
          body: JSON.stringify({
            title: formTitle,
            description: formDesc,
            match_name: formMatchName,
            competition_name: formCompName,
            options_json: options,
            deadline: new Date(formDeadline).toISOString(),
          }),
        });
        setActionSuccess('Draft question created successfully.');
      }
      
      // Reset & Reload
      setShowCreateModal(false);
      setEditingQuestion(null);
      resetForm();
      await fetchAllData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit question.');
    }
  };

  const handlePublishQuestion = async (qId: number) => {
    try {
      await apiRequest(`/questions/${qId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'active' }),
      });
      setActionSuccess('Question published. Users have been notified!');
      await fetchAllData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to publish question.');
    }
  };

  const handleLockQuestion = async (qId: number) => {
    try {
      await apiRequest(`/questions/${qId}/lock`, { method: 'POST' });
      setActionSuccess('Question locked successfully.');
      await fetchAllData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to lock question.');
    }
  };

  const handleDeleteQuestion = async (qId: number) => {
    if (!confirm('Are you sure you want to delete this question? This will remove all predictions.')) return;
    try {
      await apiRequest(`/questions/${qId}`, { method: 'DELETE' });
      setActionSuccess('Question deleted successfully.');
      await fetchAllData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete question.');
    }
  };

  const toggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      await apiRequest(`/users/${user.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      setActionSuccess(`User status changed to ${newStatus}.`);
      await fetchAllData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to toggle user status.');
    }
  };

  // Result Processing Workflow
  const openResultWorkflow = async (question: Question) => {
    setProcessingQuestion(question);
    setCorrectAnswer('');
    setWinnerPreview(null);
    setDraftResult(null);
    
    // Check if result already exist in backend
    try {
      const res = await apiRequest<Result | null>(`/results/admin/${question.id}`);
      if (res) {
        setDraftResult(res);
        setCorrectAnswer(res.correct_answer);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateWinner = async () => {
    if (!processingQuestion || !correctAnswer) return;
    setProcessingLoading(true);
    try {
      const preview = await apiRequest<WinnerPreview>(`/results/${processingQuestion.id}/answer`, {
        method: 'POST',
        body: JSON.stringify({ correct_answer: correctAnswer }),
      });
      setWinnerPreview(preview);
      
      // Reload draft state
      const res = await apiRequest<Result>(`/results/admin/${processingQuestion.id}`);
      setDraftResult(res);
    } catch (err: any) {
      setActionError(err.message || 'Failed to generate winner.');
    } finally {
      setProcessingLoading(false);
    }
  };

  const handleRegenerateWinner = async () => {
    if (!processingQuestion) return;
    setProcessingLoading(true);
    try {
      const preview = await apiRequest<WinnerPreview>(`/results/${processingQuestion.id}/regenerate`, {
        method: 'POST',
      });
      setWinnerPreview(preview);
      
      const res = await apiRequest<Result>(`/results/admin/${processingQuestion.id}`);
      setDraftResult(res);
    } catch (err: any) {
      setActionError(err.message || 'Failed to regenerate winner.');
    } finally {
      setProcessingLoading(false);
    }
  };

  const handleApproveWinner = async () => {
    if (!processingQuestion) return;
    setProcessingLoading(true);
    try {
      const res = await apiRequest<Result>(`/results/${processingQuestion.id}/approve`, {
        method: 'POST',
      });
      setDraftResult(res);
      setActionSuccess('Winner approved! Click Publish to make public.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve winner.');
    } finally {
      setProcessingLoading(false);
    }
  };

  const handlePublishWinner = async () => {
    if (!processingQuestion) return;
    setProcessingLoading(true);
    try {
      await apiRequest(`/results/${processingQuestion.id}/publish`, {
        method: 'POST',
      });
      setActionSuccess('Winner and results published publicly! Points awarded.');
      setProcessingQuestion(null);
      setWinnerPreview(null);
      setDraftResult(null);
      await fetchAllData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to publish results.');
    } finally {
      setProcessingLoading(false);
    }
  };

  const openEditModal = (q: Question) => {
    setEditingQuestion(q);
    setFormTitle(q.title);
    setFormDesc(q.description || '');
    setFormMatchName(q.match_name);
    setFormCompName(q.competition_name);
    
    if (Array.isArray(q.options_json)) {
      setFormType('options');
      setFormOptions(q.options_json.join(', '));
    } else {
      setFormType('slider');
      setFormSliderMin(q.options_json.min);
      setFormSliderMax(q.options_json.max);
    }
    
    // Format deadline for datetime-local input (YYYY-MM-DDThh:mm)
    const d = new Date(q.deadline);
    const tzoffset = d.getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    setFormDeadline(localISOTime);
    
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setEditingQuestion(null);
    setFormTitle('');
    setFormDesc('');
    setFormMatchName('');
    setFormCompName('');
    setFormType('options');
    setFormOptions('');
    setFormSliderMin(0);
    setFormSliderMax(10);
    setFormDeadline('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-primary font-headline-md">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-primary" size={48} />
          <span>Syncing Admin Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Navbar />

      <main className="pt-24 pb-32 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-secondary font-black tracking-tight flex items-center gap-2">
              <ShieldCheck className="text-secondary" />
              Admin Management
            </h1>
            <p className="text-on-surface-variant text-body-md mt-1">
              Configure predictions, choose contest winners, and manage users
            </p>
          </div>
          
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-6 py-3 bg-secondary text-on-secondary font-bold rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-secondary/10"
          >
            <Plus size={18} />
            New Prediction Question
          </button>
        </div>

        {/* Global Feedback Banner */}
        {actionError && (
          <div className="flex items-center gap-3 bg-error-container/20 border border-error/30 rounded-xl p-4 text-error text-label-md mb-6">
            <AlertCircle size={20} />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="flex items-center gap-3 bg-tertiary-container/20 border border-tertiary/30 rounded-xl p-4 text-tertiary text-label-md mb-6">
            <CheckCircle size={20} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Admin Navigation Tabs */}
        <div className="flex border-b border-outline-variant/30 gap-6 mb-8">
          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-4 font-label-md text-label-md flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'stats' ? 'border-secondary text-secondary font-bold' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <BarChart2 size={16} />
            Analytics & Stats
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`pb-4 font-label-md text-label-md flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'questions' ? 'border-secondary text-secondary font-bold' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <FileText size={16} />
            Prediction Questions ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 font-label-md text-label-md flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'users' ? 'border-secondary text-secondary font-bold' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Users size={16} />
            Manage Fans ({users.length})
          </button>
        </div>

        {/* TAB 1: ANALYTICS & STATS */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-stack-lg">
            {/* Stats Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
              <div className="glass-card rounded-xl p-6 space-y-2">
                <span className="text-xs font-bold text-outline uppercase tracking-wider">Total Registered Users</span>
                <p className="font-stats-xl text-stats-xl text-on-surface font-extrabold">{stats.total_users}</p>
                <span className="text-xs text-on-surface-variant">{stats.active_users} active (enabled)</span>
              </div>
              <div className="glass-card rounded-xl p-6 space-y-2">
                <span className="text-xs font-bold text-outline uppercase tracking-wider">Active Contests</span>
                <p className="font-stats-xl text-stats-xl text-primary font-extrabold">{stats.active_questions}</p>
                <span className="text-xs text-on-surface-variant">{stats.locked_questions} locked awaiting result</span>
              </div>
              <div className="glass-card rounded-xl p-6 space-y-2">
                <span className="text-xs font-bold text-outline uppercase tracking-wider">Total Predictions Placed</span>
                <p className="font-stats-xl text-stats-xl text-secondary font-extrabold">{stats.total_predictions}</p>
                <span className="text-xs text-on-surface-variant">{stats.participation_rate}% user participation rate</span>
              </div>
              <div className="glass-card rounded-xl p-6 space-y-2">
                <span className="text-xs font-bold text-outline uppercase tracking-wider">Prediction Accuracy</span>
                <p className="font-stats-xl text-stats-xl text-tertiary font-extrabold">{stats.prediction_accuracy}%</p>
                <span className="text-xs text-on-surface-variant">For published matches</span>
              </div>
            </div>

            {/* Quick Chart Analytics visualizations using CSS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <div className="glass-card rounded-xl p-6 space-y-4">
                <h3 className="font-headline-md text-on-surface">Daily Predictions</h3>
                <div className="h-64 flex items-end gap-3 pt-6 border-b border-l border-outline-variant/30 px-4">
                  {stats.charts.dailyParticipation.map((pt) => (
                    <div key={pt.label} className="flex-1 flex flex-col items-center gap-2 group">
                      <div
                        style={{ height: `${Math.min(pt.value * 15 || 5, 200)}px` }}
                        className="w-full bg-primary rounded-t-lg group-hover:bg-primary-fixed-dim transition-all relative"
                      >
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container border border-outline-variant/30 text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          {pt.value}
                        </span>
                      </div>
                      <span className="text-[10px] text-on-surface-variant tracking-tighter truncate w-full text-center">
                        {pt.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 space-y-4">
                <h3 className="font-headline-md text-on-surface">Prediction Density by Match</h3>
                <div className="space-y-3 pt-4">
                  {stats.charts.predictionDistribution.map((pt) => (
                    <div key={pt.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="truncate w-3/4">{pt.label}</span>
                        <span>{pt.value} predictions</span>
                      </div>
                      <div className="w-full bg-surface-container-low h-3 rounded-full overflow-hidden border border-outline-variant/10">
                        <div
                          style={{ width: `${Math.min((pt.value / Math.max(stats.total_predictions, 1)) * 100, 100)}%` }}
                          className="bg-secondary h-full rounded-full"
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUESTIONS MANAGER */}
        {activeTab === 'questions' && (
          <div className="space-y-stack-md">
            {/* Winner Processing Panel (Modal style inline if selected) */}
            {processingQuestion && (
              <section className="glass-card rounded-2xl p-6 border-secondary-container/40 bg-secondary-container/5 space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                  <h3 className="font-headline-md text-secondary flex items-center gap-2">
                    <Award />
                    Winner Raffle Workflow: {processingQuestion.match_name}
                  </h3>
                  <button onClick={() => setProcessingQuestion(null)} className="text-on-surface-variant hover:text-on-surface">
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Step 1: Submit Correct Answer */}
                  <div className="space-y-4">
                    <p className="text-label-md text-outline">STEP 1: ENTER CORRECT ANSWER</p>
                    {Array.isArray(processingQuestion.options_json) ? (
                      <div>
                        <label className="block text-xs mb-2">Select Correct Winner option:</label>
                        <div className="grid grid-cols-3 gap-2">
                          {processingQuestion.options_json.map((o) => (
                            <button
                              key={o}
                              onClick={() => setCorrectAnswer(o)}
                              disabled={draftResult?.approved}
                              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                                correctAnswer === o
                                  ? 'bg-secondary text-on-secondary border-secondary'
                                  : 'bg-surface-container border-outline-variant/20 hover:border-outline'
                              }`}
                            >
                              {o}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs mb-2">Enter numeric goal answer:</label>
                        <input
                          type="number"
                          value={correctAnswer}
                          disabled={draftResult?.approved}
                          onChange={(e) => setCorrectAnswer(e.target.value)}
                          placeholder="e.g. 3"
                          className="bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-2 text-on-surface w-full focus:outline-none focus:border-secondary"
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleGenerateWinner}
                        disabled={processingLoading || !correctAnswer || draftResult?.approved}
                        className="px-6 py-2.5 bg-secondary text-on-secondary font-bold text-xs rounded-xl flex items-center gap-1 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      >
                        Generate Winner
                      </button>
                      
                      {draftResult && !draftResult.approved && (
                        <button
                          onClick={handleRegenerateWinner}
                          disabled={processingLoading}
                          className="px-4 py-2.5 bg-surface-container border border-outline-variant/30 text-xs font-bold rounded-xl flex items-center gap-1 hover:border-secondary transition-all"
                        >
                          Regenerate Winner
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Approve & Publish Preview */}
                  <div className="space-y-4 border-t md:border-t-0 md:border-l border-outline-variant/30 pt-4 md:pt-0 md:pl-6">
                    <p className="text-label-md text-outline">STEP 2: WINNER PREVIEW & APPROVAL</p>
                    
                    {winnerPreview || draftResult ? (
                      <div className="space-y-3 bg-surface-container-high/40 p-4 rounded-xl border border-outline-variant/20">
                        <p className="text-xs text-on-surface-variant">
                          Correct Option: <span className="font-bold text-on-surface">{correctAnswer}</span>
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          Eligible users count:{' '}
                          <span className="font-bold text-on-surface">
                            {winnerPreview ? winnerPreview.eligible_users_count : 'Loading...'}
                          </span>
                        </p>
                        
                        <div className="p-3 bg-surface-container rounded-lg border border-outline-variant/30">
                          <p className="text-[10px] text-outline tracking-wider uppercase font-semibold">Raffle Winner Chosen</p>
                          <p className="font-headline-md text-primary mt-1">
                            {winnerPreview?.winner?.full_name || draftResult?.winner_name || 'NO WINNER (No correct predictors)'}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {winnerPreview?.winner?.email || ''}
                          </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                          {!draftResult?.approved ? (
                            <button
                              onClick={handleApproveWinner}
                              disabled={processingLoading || (!winnerPreview && !draftResult)}
                              className="w-full py-2 bg-tertiary text-on-tertiary text-xs font-bold rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1"
                            >
                              <Check size={14} /> Approve Winner
                            </button>
                          ) : (
                            <button
                              onClick={handlePublishWinner}
                              disabled={processingLoading || !!draftResult?.published_at}
                              className="w-full py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-lg shadow-primary/20"
                            >
                              Publish Winner & Award Points
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-on-surface-variant italic">Enter correct answer and click Generate Winner.</p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Questions Table */}
            <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border-outline-variant/30">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high/60 border-b border-outline-variant/20 text-outline text-label-md">
                    <th className="py-4 px-6">Match / Contest</th>
                    <th className="py-4 px-6">Competition</th>
                    <th className="py-4 px-6">Options</th>
                    <th className="py-4 px-6">Deadline</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-body-md">
                  {questions.map((q) => (
                    <tr key={q.id} className="hover:bg-surface-container-highest/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-on-surface">{q.match_name}</div>
                        <div className="text-xs text-on-surface-variant">{q.title}</div>
                      </td>
                      <td className="py-4 px-6 text-on-surface-variant">{q.competition_name}</td>
                      <td className="py-4 px-6 text-xs font-mono">
                        {Array.isArray(q.options_json)
                          ? q.options_json.join(' | ')
                          : `Slider Range: [${q.options_json.min} - ${q.options_json.max}]`}
                      </td>
                      <td className="py-4 px-6 text-xs text-on-surface-variant">
                        {new Date(q.deadline).toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            q.status === 'draft'
                              ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                              : q.status === 'active'
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : q.status === 'locked'
                              ? 'bg-error-container/20 text-error border border-error/30'
                              : 'bg-tertiary-container/20 text-tertiary border border-tertiary/30'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {q.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handlePublishQuestion(q.id)}
                                title="Activate & Notify Fans"
                                className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              >
                                <Play size={16} />
                              </button>
                              <button
                                onClick={() => openEditModal(q)}
                                title="Edit Question"
                                className="p-1.5 text-slate-300 hover:bg-slate-500/10 rounded-lg transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                            </>
                          )}

                          {q.status === 'active' && (
                            <button
                              onClick={() => handleLockQuestion(q.id)}
                              title="Lock predictions"
                              className="p-1.5 text-error hover:bg-error-container/10 rounded-lg transition-colors"
                            >
                              <Lock size={16} />
                            </button>
                          )}

                          {(q.status === 'locked' || q.status === 'completed') && (
                            <button
                              onClick={() => openResultWorkflow(q)}
                              title="Process Result / Raffle Winner"
                              className="px-3 py-1 bg-secondary text-on-secondary text-xs font-bold rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                            >
                              <Award size={14} /> Process Winner
                            </button>
                          )}

                          {q.status === 'published' && (
                            <span className="text-xs text-tertiary font-bold flex items-center gap-1">
                              <CheckCircle size={14} /> Finalized
                            </span>
                          )}

                          {q.status === 'draft' && (
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              title="Delete Question"
                              className="p-1.5 text-error/70 hover:text-error hover:bg-error-container/10 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: USER MANAGER */}
        {activeTab === 'users' && (
          <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border-outline-variant/30">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/60 border-b border-outline-variant/20 text-outline text-label-md">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Email</th>
                  <th className="py-4 px-6">Points</th>
                  <th className="py-4 px-6">Registered On</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Toggle status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-body-md">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-container-highest/20 transition-colors">
                    <td className="py-4 px-6 font-semibold">{u.full_name}</td>
                    <td className="py-4 px-6 text-on-surface-variant">{u.email}</td>
                    <td className="py-4 px-6 font-stats-xl text-primary font-bold text-sm">{u.points}</td>
                    <td className="py-4 px-6 text-xs text-on-surface-variant">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.status === 'active'
                            ? 'bg-tertiary-container/20 text-tertiary border border-tertiary/20'
                            : 'bg-error-container/20 text-error border border-error/20'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {u.id !== stats?.total_users ? (
                        <button
                          onClick={() => toggleUserStatus(u)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
                            u.status === 'active'
                              ? 'bg-error-container/20 text-error hover:bg-error-container/40'
                              : 'bg-tertiary-container/20 text-tertiary hover:bg-tertiary-container/40'
                          }`}
                        >
                          {u.status === 'active' ? 'Disable User' : 'Enable User'}
                        </button>
                      ) : (
                        <span className="text-xs text-outline italic">Admin Master</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>

      {/* CREATE / EDIT QUESTION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-surface/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg rounded-2xl p-6 border-secondary-container/30 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
              <h2 className="font-headline-md text-secondary">
                {editingQuestion ? 'Edit Prediction Question' : 'Create Prediction Question'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingQuestion(null);
                  resetForm();
                }}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <XCircle />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateQuestion} className="space-y-4">
              <div>
                <label className="block text-xs text-outline mb-1">Match Title Description</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Who will win today's Argentina vs Brazil match?"
                  className="bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-2.5 text-on-surface w-full focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs text-outline mb-1">Detailed Description (Optional)</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. Regular time + Extra time included. Penalties excluded."
                  className="bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-2.5 text-on-surface w-full focus:outline-none focus:border-secondary h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-outline mb-1">Match Name</label>
                  <input
                    type="text"
                    required
                    value={formMatchName}
                    onChange={(e) => setFormMatchName(e.target.value)}
                    placeholder="e.g. Argentina vs Brazil"
                    className="bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-2.5 text-on-surface w-full focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-outline mb-1">Competition Name</label>
                  <input
                    type="text"
                    required
                    value={formCompName}
                    onChange={(e) => setFormCompName(e.target.value)}
                    placeholder="e.g. World Cup Final"
                    className="bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-2.5 text-on-surface w-full focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-outline mb-1">Question Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-2.5 text-on-surface w-full focus:outline-none focus:border-secondary"
                >
                  <option value="options">Single Choice Options (Text)</option>
                  <option value="slider">Numeric Range Slider</option>
                </select>
              </div>

              {formType === 'options' ? (
                <div>
                  <label className="block text-xs text-outline mb-1">Options (Comma separated)</label>
                  <input
                    type="text"
                    required={formType === 'options'}
                    value={formOptions}
                    onChange={(e) => setFormOptions(e.target.value)}
                    placeholder="e.g. Argentina, Draw, Brazil"
                    className="bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-2.5 text-on-surface w-full focus:outline-none focus:border-secondary"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs text-outline mb-1">Min Value</label>
                    <input
                      type="number"
                      value={formSliderMin}
                      onChange={(e) => setFormSliderMin(Number(e.target.value))}
                      className="bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-2.5 text-on-surface w-full focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-outline mb-1">Max Value</label>
                    <input
                      type="number"
                      value={formSliderMax}
                      onChange={(e) => setFormSliderMax(Number(e.target.value))}
                      className="bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-2.5 text-on-surface w-full focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-outline mb-1">Prediction Deadline</label>
                <input
                  type="datetime-local"
                  required
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  className="bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-2.5 text-on-surface w-full focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingQuestion(null);
                    resetForm();
                  }}
                  className="px-5 py-2 bg-surface-container border border-outline-variant/20 rounded-xl text-on-surface hover:bg-surface-container-highest transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-secondary text-on-secondary font-bold rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1 shadow-lg shadow-secondary/15"
                >
                  <Save size={16} />
                  {editingQuestion ? 'Update Question' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple icon helpers
const XCircle: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);

const Save: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-save"><path d="M21 20H3V4h13l5 5V20z"/><path d="M16 4v5H8V4"/><path d="M18 13.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/></svg>
);
