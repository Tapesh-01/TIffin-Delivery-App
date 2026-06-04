import React, { useState } from 'react';
import './SystemLogsView.css';

interface SystemLogsViewProps {
  activityLogs: any[];
}

export const SystemLogsView: React.FC<SystemLogsViewProps> = ({ activityLogs }) => {
  const [logFilter, setLogFilter] = useState<'all' | 'auth' | 'orders' | 'finance' | 'other'>('all');

  const filteredLogs = activityLogs.filter(log => {
    if (logFilter === 'all') return true;
    if (logFilter === 'auth') return ['signup', 'login', 'profile_update'].includes(log.activityType);
    if (logFilter === 'orders') return ['order_placed', 'order_dispatched', 'order_delivered', 'poll_voted'].includes(log.activityType);
    if (logFilter === 'finance') return ['wallet_recharge_request', 'wallet_recharge_approved', 'wallet_recharge_rejected', 'referral_applied', 'admin_adjustment', 'plan_subscribed'].includes(log.activityType);
    return ['vacation_started', 'vacation_cancelled', 'meal_rated'].includes(log.activityType);
  });

  const getBadgeStyles = (type: string) => {
    const mappings: Record<string, { bg: string, color: string, icon: string }> = {
      signup: { bg: '#dcfce7', color: '#15803d', icon: '🆕' },
      login: { bg: '#e0f2fe', color: '#0369a1', icon: '🔑' },
      profile_update: { bg: '#f1f5f9', color: '#475569', icon: '👤' },
      referral_applied: { bg: '#faf5ff', color: '#7e22ce', icon: '🎁' },
      wallet_recharge_request: { bg: '#fef3c7', color: '#b45309', icon: '💳' },
      wallet_recharge_approved: { bg: '#dcfce7', color: '#15803d', icon: '✅' },
      wallet_recharge_rejected: { bg: '#fee2e2', color: '#b91c1c', icon: '❌' },
      plan_subscribed: { bg: '#e0e7ff', color: '#4338ca', icon: '👑' },
      order_placed: { bg: '#ffedd5', color: '#c2410c', icon: '🍛' },
      order_dispatched: { bg: '#f3e8ff', color: '#6b21a8', icon: '🛵' },
      order_delivered: { bg: '#dcfce7', color: '#15803d', icon: '📦' },
      vacation_started: { bg: '#fee2e2', color: '#b91c1c', icon: '🏖️' },
      vacation_cancelled: { bg: '#f1f5f9', color: '#475569', icon: '↩️' },
      meal_rated: { bg: '#fef9c3', color: '#a16207', icon: '⭐' },
      poll_voted: { bg: '#ecfdf5', color: '#047857', icon: '🗳️' },
      admin_adjustment: { bg: '#e0f2fe', color: '#0369a1', icon: '⚙️' }
    };
    return mappings[type] || { bg: '#f1f5f9', color: '#475569', icon: '📝' };
  };

  return (
    <div className="logs-container">
      <div className="logs-header">
        <div>
          <h3 className="logs-title">System Activity Logs</h3>
          <p className="logs-subtitle">
            Track live student signups, order transactions, referral rewards, and system logs in real-time.
          </p>
        </div>
        <div className="live-feed-badge">
          <span className="live-feed-dot" />
          <span>Live Feed Active</span>
        </div>
      </div>

      {/* Filters */}
      <div className="logs-filters">
        {[
          { id: 'all', label: '📋 All Logs' },
          { id: 'auth', label: '👤 Auth & Profiles' },
          { id: 'orders', label: '🍛 Orders & Polls' },
          { id: 'finance', label: '💰 Wallet & Referrals' },
          { id: 'other', label: '🏝️ Vacations & Ratings' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setLogFilter(f.id as any)}
            className="logs-filter-btn"
            style={{
              backgroundColor: logFilter === f.id ? 'var(--primary)' : 'var(--bg-secondary)',
              color: logFilter === f.id ? '#ffffff' : 'var(--text-primary)'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Terminal Sheet */}
      <div className="terminal-sheet">
        {filteredLogs.length === 0 ? (
          <div className="terminal-empty">
            &gt; No activity logs recorded for this category yet.
          </div>
        ) : (
          filteredLogs.map(log => {
            const badge = getBadgeStyles(log.activityType);
            const logDate = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <div key={log._id || log.id} className="log-item">
                <span className="log-time">[{logDate}]</span>
                <span className="log-badge" style={{
                  backgroundColor: badge.bg,
                  color: badge.color
                }}>
                  <span>{badge.icon}</span>
                  <span>{log.activityType.replace('_', ' ')}</span>
                </span>
                <span className="log-desc">{log.description}</span>
                {log.user && (
                  <span className="log-user">
                    @{log.user.name || log.user.phone || 'student'}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
