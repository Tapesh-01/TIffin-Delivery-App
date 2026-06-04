import React, { useState } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import './FinanceAnalytics.css';

interface FinanceAnalyticsProps {
  transactions: any[];
  profiles: any[];
  allOrders: any[];
  todayRevenue: number;
  todayCashInflow: number;
  allTimeRevenue: number;
  allTimeCashInflow: number;
  getRevenueForLast7Days: () => any[];
}

export const FinanceAnalytics: React.FC<FinanceAnalyticsProps> = ({
  transactions,
  profiles,
  allOrders,
  todayRevenue,
  todayCashInflow,
  allTimeRevenue,
  allTimeCashInflow,
  getRevenueForLast7Days
}) => {
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [expandedLedgerUsers, setExpandedLedgerUsers] = useState<Record<string, boolean>>({});

  const last7DaysData = getRevenueForLast7Days();
  const maxRevenue = Math.max(...last7DaysData.map(d => d.revenue), 1);
  const maxRecharges = Math.max(...last7DaysData.map(d => d.recharges), 1);
  const overallMax = Math.max(maxRevenue, maxRecharges, 100);

  const chartHeight = 260;
  const chartWidth = 720;
  const paddingLeft = 50;
  const paddingBottom = 60;
  const paddingTop = 20;
  const paddingRight = 20;

  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Points calculation
  const pointsRevenue = last7DaysData.map((d, index) => {
    const x = paddingLeft + (index * (graphWidth / 6));
    const y = paddingTop + graphHeight - ((d.revenue / overallMax) * graphHeight);
    return { x, y, val: d.revenue, label: d.dateLabel };
  });

  const pointsRecharges = last7DaysData.map((d, index) => {
    const x = paddingLeft + (index * (graphWidth / 6));
    const y = paddingTop + graphHeight - ((d.recharges / overallMax) * graphHeight);
    return { x, y, val: d.recharges };
  });

  const linePathRevenue = pointsRevenue.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const linePathRecharges = pointsRecharges.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Group transactions by student name
  const groupedTransactions: Record<string, {
    studentName: string;
    profile: any;
    transactions: any[];
    totalRecharged: number;
    totalSpent: number;
  }> = {};

  transactions.forEach(tx => {
    const name = tx.profiles?.name || 'Student User';
    if (!groupedTransactions[name]) {
      const prof = profiles.find(p => p.name === name) || {
        name,
        phone: tx.profiles?.phone || 'N/A',
        plan: 'none',
        walletBalance: tx.profiles?.walletBalance || 0
      };
      groupedTransactions[name] = {
        studentName: name,
        profile: prof,
        transactions: [],
        totalRecharged: 0,
        totalSpent: 0
      };
    }

    groupedTransactions[name].transactions.push(tx);

    if (tx.status === 'approved') {
      if (tx.type === 'recharge' || tx.type === 'refund' || tx.type === 'referral_bonus') {
        groupedTransactions[name].totalRecharged += tx.amount;
      } else {
        groupedTransactions[name].totalSpent += Math.abs(tx.amount);
      }
    }
  });

  // Filter groups by search query
  const filteredGroups = Object.values(groupedTransactions).filter(group => 
    group.studentName.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
    (group.profile?.phone || '').includes(ledgerSearchQuery)
  );

  return (
    <div className="finance-container">
      <div className="finance-header">
        <h3 className="finance-title">Earnings & Financial Dashboard</h3>
        <p className="finance-subtitle">Track daily earnings, cash collections, liabilities, and historic trends.</p>
      </div>

      {/* Financial Metrics Cards */}
      <div className="finance-metrics">
        <div className="finance-metric-card">
          <span className="finance-metric-label">Today's Revenue</span>
          <h3 className="finance-metric-val" style={{ color: 'var(--accent-green)' }}>₹{todayRevenue}</h3>
          <span className="finance-metric-sub">Delivered tiffins today</span>
        </div>

        <div className="finance-metric-card">
          <span className="finance-metric-label">Today's Cash Inflow</span>
          <h3 className="finance-metric-val" style={{ color: 'var(--accent-gold)' }}>₹{todayCashInflow}</h3>
          <span className="finance-metric-sub">Approved wallet recharges</span>
        </div>

        <div className="finance-metric-card">
          <span className="finance-metric-label">All-Time Revenue</span>
          <h3 className="finance-metric-val" style={{ color: 'var(--accent-green)' }}>₹{allTimeRevenue}</h3>
          <span className="finance-metric-sub">Delivered meals value ever</span>
        </div>

        <div className="finance-metric-card">
          <span className="finance-metric-label">All-Time Inflow</span>
          <h3 className="finance-metric-val" style={{ color: 'var(--accent-gold)' }}>₹{allTimeCashInflow}</h3>
          <span className="finance-metric-sub">Wallet deposits approved ever</span>
        </div>
      </div>

      {/* Dynamic SVG Charts Section */}
      <div className="charts-layout">
        {/* SVG Line Chart (7-Day Trend) */}
        <div className="chart-card">
          <h4 className="chart-title">
            <TrendingUp size={16} style={{ color: 'var(--accent-green)' }} /> Last 7 Days Revenue Trend (₹)
          </h4>
          
          <div className="chart-svg-wrap">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="chart-svg">
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                const y = paddingTop + graphHeight * r;
                const labelVal = Math.round(overallMax * (1 - r));
                return (
                  <g key={i}>
                    <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="var(--bg-tertiary)" strokeWidth="1" />
                    <text x={paddingLeft - 10} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">{labelVal}</text>
                  </g>
                );
              })}

              {/* X-Axis Labels */}
              {pointsRevenue.map((p, i) => (
                <text key={i} x={p.x} y={chartHeight - paddingBottom + 25} fill="var(--text-muted)" fontSize="10" textAnchor="middle">
                  {p.label}
                </text>
              ))}

              {/* Recharges Path */}
              <path d={linePathRecharges} fill="none" stroke="var(--accent-gold)" strokeWidth="2" strokeDasharray="4 4" />
              
              {/* Revenue Path */}
              <path d={linePathRevenue} fill="none" stroke="var(--accent-green)" strokeWidth="3" />

              {/* Points Circles */}
              {pointsRevenue.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="5" fill="var(--accent-green)" stroke="var(--bg-secondary)" strokeWidth="1.5" />
                  {p.val > 0 && (
                    <text x={p.x} y={p.y - 10} fill="var(--accent-green)" fontSize="9" fontWeight="bold" textAnchor="middle">₹{p.val}</text>
                  )}
                </g>
              ))}
              
              {pointsRecharges.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="4" fill="var(--accent-gold)" stroke="var(--bg-secondary)" strokeWidth="1" />
                  {p.val > 0 && (
                    <text x={p.x} y={p.y + 16} fill="var(--accent-gold)" fontSize="9" textAnchor="middle">₹{p.val}</text>
                  )}
                </g>
              ))}
            </svg>

            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-line-green"></span>
                <span style={{ color: 'var(--text-secondary)' }}>Revenue Earned (Delivered Meals)</span>
              </div>
              <div className="legend-item">
                <span className="legend-line-dashed"></span>
                <span style={{ color: 'var(--text-secondary)' }}>Cash Collected (Recharges Approved)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Liability Breakdown */}
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Ledger Distribution</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Basic Subscription Value:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{allOrders.filter(o => o.isTiffinOrder && o.user?.plan === 'basic' && o.status === 'delivered').length * 70}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Standard Subscription Value:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{allOrders.filter(o => o.isTiffinOrder && o.user?.plan === 'standard' && o.status === 'delivered').length * 90}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Premium Subscription Value:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{allOrders.filter(o => o.isTiffinOrder && o.user?.plan === 'premium' && o.status === 'delivered').length * 130}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Outstanding Liability:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-purple)' }}>₹{profiles.reduce((sum, p) => sum + Number(p.walletBalance || p.wallet_balance || 0), 0)}</span>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: 'auto', margin: 0 }}>
            Outstanding Liability measures active student wallet balances that represent prepaid meals not yet cooked or delivered.
          </p>
        </div>
      </div>

      {/* Transactions Ledger Accordion View */}
      <div className="ledger-wrapper">
        <div className="ledger-header">
          <div>
            <h4 className="ledger-title">Student Financial Ledger</h4>
            <p className="ledger-subtitle">Transactions grouped by student. Click a student card to see their complete history.</p>
          </div>
          
          {/* Ledger Search Input */}
          <div className="ledger-search">
            <Search size={16} style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search student ledger..." 
              value={ledgerSearchQuery}
              onChange={(e) => setLedgerSearchQuery(e.target.value)}
              className="ledger-search-input"
            />
          </div>
        </div>

        <div className="ledger-list">
          {filteredGroups.length === 0 ? (
            <div className="ledger-empty">
              No matching student ledgers found.
            </div>
          ) : (
            filteredGroups.map(group => {
              const isExpanded = !!expandedLedgerUsers[group.studentName];
              const planColor = group.profile?.plan === 'premium' ? 'var(--accent-purple)' : group.profile?.plan === 'standard' ? 'var(--primary)' : group.profile?.plan === 'basic' ? 'var(--accent-blue)' : 'var(--text-muted)';
              return (
                <div 
                  key={group.studentName}
                  className="ledger-card"
                  style={{ backgroundColor: isExpanded ? 'var(--bg-tertiary)' : 'var(--bg-secondary)' }}
                >
                  {/* Accordion Header */}
                  <div 
                    onClick={() => setExpandedLedgerUsers(prev => ({ ...prev, [group.studentName]: !prev[group.studentName] }))}
                    className="accordion-header"
                  >
                    <div className="student-info-wrap">
                      <div className="student-avatar">
                        {group.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="student-name">{group.studentName}</h4>
                        <span className="student-phone">📞 {group.profile?.phone || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="accordion-stats">
                      <div className="stat-group">
                        <div className="stat-label">Active Plan</div>
                        <span className="stat-val-plan" style={{ backgroundColor: planColor }}>
                          {group.profile?.plan || 'None'}
                        </span>
                      </div>

                      <div className="stat-group">
                        <div className="stat-label">Total Recharged</div>
                        <span className="stat-val-recharged">+₹{group.totalRecharged}</span>
                      </div>

                      <div className="stat-group">
                        <div className="stat-label">Total Spent</div>
                        <span className="stat-val-spent">-₹{group.totalSpent}</span>
                      </div>

                      <div className="stat-group" style={{ minWidth: '100px' }}>
                        <div className="stat-label">Wallet Balance</div>
                        <span className="stat-val-balance">₹{group.profile?.walletBalance || 0}</span>
                      </div>

                      <span className="accordion-arrow">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="accordion-content">
                      <table className="ledger-table">
                        <thead>
                          <tr>
                            <th>Tx ID</th>
                            <th>Type</th>
                            <th>Description</th>
                            <th>UTR Code</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.transactions.map((tx) => {
                            const isPositive = tx.type === 'recharge' || tx.type === 'refund' || tx.type === 'referral_bonus';
                            return (
                              <tr key={tx.id || tx._id}>
                                <td className="tx-id">{(tx.id || tx._id || '').substring(0, 8)}...</td>
                                <td>
                                  <span className="tx-badge" style={{
                                    backgroundColor: tx.type === 'recharge' ? 'var(--accent-blue-light)' : tx.type === 'refund' ? 'var(--accent-green-light)' : tx.type === 'referral_bonus' ? 'var(--accent-purple-light)' : 'var(--accent-red-light)',
                                    color: tx.type === 'recharge' ? 'var(--accent-blue)' : tx.type === 'refund' ? 'var(--accent-green)' : tx.type === 'referral_bonus' ? 'var(--accent-purple)' : 'var(--accent-red)'
                                  }}>
                                    {tx.type.replace('_', ' ')}
                                  </span>
                                </td>
                                <td>{tx.description}</td>
                                <td className="tx-utr">{tx.utr || 'N/A'}</td>
                                <td className="tx-amount" style={{ color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                  {isPositive ? `+₹${tx.amount}` : `-₹${Math.abs(tx.amount)}`}
                                </td>
                                <td>
                                  <span className="tx-status" style={{
                                    backgroundColor: tx.status === 'approved' ? 'var(--accent-green-light)' : tx.status === 'pending' ? 'var(--accent-gold-light)' : 'var(--accent-red-light)',
                                    color: tx.status === 'approved' ? 'var(--accent-green)' : tx.status === 'pending' ? 'var(--accent-gold)' : 'var(--accent-red)'
                                  }}>
                                    {tx.status || 'approved'}
                                  </span>
                                </td>
                                <td className="tx-date">
                                  {tx.created_at ? new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
