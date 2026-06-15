import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import type { LeaderboardRow, Leaderboard as LeaderboardType } from '../types';
import { Navbar } from '../components/Navbar';
import { Trophy, Medal, Award } from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'overall' | 'weekly' | 'monthly'>('overall');
  const [rankings, setRankings] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRankings = async (frame: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<LeaderboardType>(`/leaderboard/?timeframe=${frame}`);
      setRankings(data.rankings);
    } catch (err) {
      console.error('Failed to fetch rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings(timeframe);
  }, [timeframe]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Medal size={24} className="text-secondary" />; // Gold
    if (rank === 2) return <Medal size={24} className="text-slate-300" />; // Silver
    if (rank === 3) return <Medal size={24} className="text-amber-600" />; // Bronze
    return <span className="text-on-surface-variant font-bold w-6 text-center">{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      
      <main className="pt-24 pb-32 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary font-black tracking-tight flex items-center justify-center gap-3">
            <Trophy className="text-secondary animate-bounce" />
            Global Rankings
          </h1>
          <p className="text-on-surface-variant text-body-lg max-w-md mx-auto mt-2">
            Top predictors in Elangode. Earn points by guessing correct matches!
          </p>
        </div>

        {/* Timeframe selector tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 bg-surface-container-high rounded-full border border-outline-variant/20">
            {(['weekly', 'monthly', 'overall'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setTimeframe(tab)}
                className={`px-6 py-2 rounded-full font-label-md text-label-md transition-all capitalize ${
                  timeframe === tab
                    ? 'bg-primary text-on-primary font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <section className="glass-card rounded-2xl overflow-hidden max-w-4xl mx-auto border-outline-variant/30 shadow-2xl">
          {loading ? (
            <div className="p-20 text-center text-primary font-headline-md animate-pulse">
              Calculating Standings...
            </div>
          ) : rankings.length === 0 ? (
            <div className="p-20 text-center text-on-surface-variant space-y-2">
              <Award size={48} className="mx-auto text-outline" />
              <h3 className="font-headline-md text-on-surface">No predictions processed yet</h3>
              <p>Rankings will appear once active questions are marked correct and published by Admin.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high/60 border-b border-outline-variant/20 text-outline text-label-md">
                    <th className="py-4 px-6 text-center w-16">Rank</th>
                    <th className="py-4 px-6">Predictor</th>
                    <th className="py-4 px-6 text-right">Points</th>
                    <th className="py-4 px-6 text-center">Correct</th>
                    <th className="py-4 px-6 text-center">Total Votes</th>
                    <th className="py-4 px-6 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-body-md">
                  {rankings.map((row) => (
                    <tr
                      key={row.user_id}
                      className={`transition-colors ${
                        row.rank <= 3
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : 'hover:bg-surface-container-highest/20'
                      }`}
                    >
                      <td className="py-4 px-6 flex items-center justify-center">
                        {getRankBadge(row.rank)}
                      </td>
                      <td className="py-4 px-6 font-semibold text-on-surface">
                        {row.full_name}
                        {row.rank === 1 && (
                          <span className="ml-2 text-[10px] bg-secondary-container/20 text-secondary border border-secondary/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Leader
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-stats-xl text-primary font-bold">
                        {row.total_points}
                      </td>
                      <td className="py-4 px-6 text-center font-medium text-tertiary">
                        {row.correct_predictions}
                      </td>
                      <td className="py-4 px-6 text-center text-on-surface-variant">
                        {row.total_predictions}
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-secondary-fixed-dim">
                        {row.win_percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
