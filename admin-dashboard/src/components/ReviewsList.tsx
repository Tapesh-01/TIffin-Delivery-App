import React from 'react';
import { AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import './ReviewsList.css';

interface ReviewsListProps {
  mealRatingsAvg: number;
  mealRatings: any[];
  vacationRequests: any[];
  setVacationRequests: React.Dispatch<React.SetStateAction<any[]>>;
  activePoll: any;
  pollQuestion: string;
  setPollQuestion: (q: string) => void;
  pollOptionA: string;
  setPollOptionA: (o: string) => void;
  pollOptionB: string;
  setPollOptionB: (o: string) => void;
  handleCreatePoll: (e: React.FormEvent) => void;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({
  mealRatingsAvg,
  mealRatings,
  vacationRequests,
  setVacationRequests,
  activePoll,
  pollQuestion,
  setPollQuestion,
  pollOptionA,
  setPollOptionA,
  pollOptionB,
  setPollOptionB,
  handleCreatePoll,
}) => {
  return (
    <div className="reviews-container">
      
      {/* ── SECTION 1: Live Meal Ratings ── */}
      <div className="reviews-section">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              ⭐ Aaj Ki Meal Ratings
              <span className="section-title-badge live">
                LIVE
              </span>
            </h3>
            <p className="section-subtitle">
              Students app se rate karte hi yahan instantly aata hai • Today: {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
          </div>
          <div className="avg-rating-badge">
            <div className="avg-rating-val">
              {mealRatingsAvg > 0 ? mealRatingsAvg : '—'}
            </div>
            <div className="avg-rating-label">Avg / 5 • {mealRatings.length} ratings</div>
            <div className="avg-rating-stars">
              {'★'.repeat(Math.round(mealRatingsAvg)).split('').map((_, i) => <span key={i} style={{ color: '#F59E0B' }}>★</span>)}
              {'★'.repeat(5 - Math.round(mealRatingsAvg)).split('').map((_, i) => <span key={i} style={{ color: 'var(--border)' }}>★</span>)}
            </div>
          </div>
        </div>

        {mealRatings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>⭐</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Abhi tak koi rating nahi aayi. Student app se rate karo to yahan live dikhega!</p>
          </div>
        ) : (
          <div className="ratings-grid">
            {mealRatings.map((r: any, idx: number) => (
              <div key={r.ratingId || idx} className="rating-card" style={{
                border: r.rating <= 2 ? '1.5px solid rgba(239,68,68,0.6)' : r.rating === 5 ? '1.5px solid rgba(34,197,94,0.5)' : '1px solid var(--border)',
              }}>
                {/* Live badge */}
                <div className="rating-card-live-dot" />

                <div className="rating-card-header">
                  <div>
                    <h4 className="rating-user-name">{r.userName || 'Student'}</h4>
                    <p className="rating-meal-meta">{r.mealName} • {r.dayName}</p>
                  </div>
                  <div className="rating-stars">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} style={{ fontSize: '16px', color: s <= r.rating ? '#F59E0B' : 'var(--border)' }}>★</span>
                    ))}
                  </div>
                </div>

                {r.comment && (
                  <p className="rating-comment">
                    "{r.comment}"
                  </p>
                )}

                <div className="rating-card-footer">
                  <span>{r.date}</span>
                  {r.rating <= 2 && (
                    <span className="rating-attention-badge">
                      <AlertCircle size={11} /> Attention needed
                    </span>
                  )}
                  {r.rating === 5 && <span className="rating-excellent-badge">🌟 Excellent!</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 2: Live Vacation Requests ── */}
      <div className="reviews-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '28px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 className="section-title">
            🏖️ Vacation Requests
            <span className="section-title-badge purple">
              LIVE
            </span>
            {vacationRequests.filter((v: any) => v.status === 'pending').length > 0 && (
              <span className="section-title-badge red" style={{ marginLeft: '8px' }}>
                {vacationRequests.filter((v: any) => v.status === 'pending').length} Pending
              </span>
            )}
          </h3>
          <p className="section-subtitle">
            Student vacation mode set karte hi yahan instantly aata hai. Approve karo to student ka tiffin pause ho jaayega.
          </p>
        </div>

        {vacationRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏖️</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Koi vacation request nahi hai. Student app se vacation set karo to yahan live dikhega!</p>
          </div>
        ) : (
          <div className="vacations-list">
            {vacationRequests.filter((v: any) => v.status !== 'cancelled').map((vac: any, idx: number) => (
              <div key={vac.requestId || idx} className="vacation-card" style={{
                border: vac.status === 'pending' ? '1.5px solid #F59E0B' : vac.status === 'active' ? '1.5px solid #22C55E' : '1px solid var(--border)',
              }}>
                <div style={{ flex: 1 }}>
                  <div className="vacation-card-header">
                    <h4 className="vacation-user-name">{vac.userName}</h4>
                    <span className={`vacation-status-badge ${vac.status}`}>
                      {vac.status === 'pending' ? '⏳ Pending Approval' : vac.status === 'active' ? '✅ Approved - On Vacation' : vac.status}
                    </span>
                  </div>
                  <p className="vacation-meta">
                    📅 {vac.startDate} → {vac.endDate} &nbsp;•&nbsp; {vac.days} din &nbsp;•&nbsp; 📞 {vac.phone || 'N/A'}
                  </p>
                  {vac.reason && (
                    <p className="vacation-reason">
                      Reason: "{vac.reason}"
                    </p>
                  )}
                  <p className="vacation-timestamp">
                    Requested: {new Date(vac.requestedAt || Date.now()).toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Action Buttons */}
                {vac.status === 'pending' && vac.userId && vac.requestId && (
                  <div className="vacation-actions">
                    <button
                      onClick={async () => {
                        try {
                          await api.put(`/admin/vacations/${vac.userId}/${vac.requestId}/status`, { status: 'active' });
                          setVacationRequests(prev => prev.map((v: any) =>
                            v.requestId === vac.requestId ? { ...v, status: 'active' } : v
                          ));
                        } catch (e) { alert('Error approving vacation'); }
                      }}
                      className="btn-approve"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await api.put(`/admin/vacations/${vac.userId}/${vac.requestId}/status`, { status: 'cancelled' });
                          setVacationRequests(prev => prev.map((v: any) =>
                            v.requestId === vac.requestId ? { ...v, status: 'cancelled' } : v
                          ));
                        } catch (e) { alert('Error declining vacation'); }
                      }}
                      className="btn-decline"
                    >
                      ❌ Decline
                    </button>
                  </div>
                )}
                {vac.status === 'active' && vac.userId && vac.requestId && (
                  <button
                    onClick={async () => {
                      try {
                        await api.put(`/admin/vacations/${vac.userId}/${vac.requestId}/status`, { status: 'completed' });
                        setVacationRequests(prev => prev.map((v: any) =>
                          v.requestId === vac.requestId ? { ...v, status: 'completed' } : v
                        ));
                      } catch (e) { alert('Error completing vacation'); }
                    }}
                    className="btn-complete"
                  >
                    🏠 Mark Complete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 3: Weekly Special Food Poll (Real-time) ── */}
      <div className="reviews-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '28px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 className="section-title">
            🗳️ Weekly Special Food Poll
            <span className="section-title-badge" style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
              REAL-TIME
            </span>
          </h3>
          <p className="section-subtitle">
            Manage the active voting poll and monitor candidate selection statistics in real-time.
          </p>
        </div>

        <div className="poll-section-grid">
          {/* Poll Status Card */}
          <div className="poll-details-card">
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px' }}>Active Poll Details</span>
              {activePoll ? (
                <>
                  <h4 className="poll-question">
                    "{activePoll.question}"
                  </h4>

                  {/* Votes breakdown */}
                  {(() => {
                    const votesA = activePoll.votes_a || 0;
                    const votesB = activePoll.votes_b || 0;
                    const total = votesA + votesB;
                    const pctA = total > 0 ? Math.round((votesA / total) * 100) : 50;
                    const pctB = total > 0 ? Math.round((votesB / total) * 100) : 50;
                    
                    // Determine leader
                    let leaderMessage = '';
                    let leaderStyle: React.CSSProperties = {};
                    if (total === 0) {
                      leaderMessage = '⏳ No votes cast yet.';
                      leaderStyle = { color: 'var(--text-muted)' };
                    } else if (votesA > votesB) {
                      leaderMessage = `🏆 "${activePoll.option_a}" is leading by ${votesA - votesB} vote(s)!`;
                      leaderStyle = { color: '#10b981', fontWeight: 'bold', backgroundColor: 'rgba(16,185,129,0.08)', padding: '10px 16px', borderRadius: '8px', border: '1px dashed rgba(16,185,129,0.3)' };
                    } else if (votesB > votesA) {
                      leaderMessage = `🏆 "${activePoll.option_b}" is leading by ${votesB - votesA} vote(s)!`;
                      leaderStyle = { color: '#10b981', fontWeight: 'bold', backgroundColor: 'rgba(16,185,129,0.08)', padding: '10px 16px', borderRadius: '8px', border: '1px dashed rgba(16,185,129,0.3)' };
                    } else {
                      leaderMessage = `🤝 Both options are tied at ${votesA} votes each!`;
                      leaderStyle = { color: '#f59e0b', fontWeight: 'bold', backgroundColor: 'rgba(245,158,11,0.08)', padding: '10px 16px', borderRadius: '8px', border: '1px dashed rgba(245,158,11,0.3)' };
                    }

                    return (
                      <div className="poll-bars-wrap">
                        {/* Option A bar */}
                        <div className="poll-option-row">
                          <div className="poll-option-label">
                            <span style={{ fontWeight: votesA >= votesB && total > 0 ? 600 : 400, color: votesA >= votesB && total > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {activePoll.option_a} {votesA >= votesB && total > 0 && '⭐'}
                            </span>
                            <span className="poll-option-stats">{votesA} votes ({pctA}%)</span>
                          </div>
                          <div className="poll-bar-container">
                            <div className="poll-bar-fill" style={{ width: `${pctA}%`, backgroundColor: '#f97316' }} />
                          </div>
                        </div>

                        {/* Option B bar */}
                        <div className="poll-option-row">
                          <div className="poll-option-label">
                            <span style={{ fontWeight: votesB >= votesA && total > 0 ? 600 : 400, color: votesB >= votesA && total > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {activePoll.option_b} {votesB >= votesA && total > 0 && '⭐'}
                            </span>
                            <span className="poll-option-stats">{votesB} votes ({pctB}%)</span>
                          </div>
                          <div className="poll-bar-container">
                            <div className="poll-bar-fill" style={{ width: `${pctB}%`, backgroundColor: '#3b82f6' }} />
                          </div>
                        </div>

                        {/* Leader Message Display */}
                        <div className="poll-leader-msg" style={leaderStyle}>
                          {leaderMessage}
                        </div>

                        <div className="poll-votes-total">
                          Total Votes Count: {total}
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>No active poll running. Deploy a new poll on the right to start voting!</p>
              )}
            </div>
          </div>

          {/* Create New Poll Card */}
          <div className="poll-create-card">
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px' }}>Deploy New Weekly Special Poll</span>
            <form onSubmit={handleCreatePoll} className="poll-form">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Poll Question</label>
                <input 
                  type="text" 
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g. What should be Saturday's Special?"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', outline: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}
                  required 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Option A Description</label>
                <input 
                  type="text" 
                  value={pollOptionA}
                  onChange={(e) => setPollOptionA(e.target.value)}
                  placeholder="e.g. Chole Bhature 🍛"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', outline: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}
                  required 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Option B Description</label>
                <input 
                  type="text" 
                  value={pollOptionB}
                  onChange={(e) => setPollOptionB(e.target.value)}
                  placeholder="e.g. Paneer Tikka 🧀"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', outline: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}
                  required 
                />
              </div>

              <button 
                type="submit" 
                className="poll-btn-deploy"
              >
                🚀 Deploy & Broadcast Poll
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
};
