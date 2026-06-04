import React from 'react';
import { Search, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import './CrmConsole.css';

interface StudentProfile {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  plan?: string;
  streak?: number;
  walletBalance?: number;
  wallet_balance?: number;
  wallet_use?: number;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  addressHostel?: string;
  address_hostel?: string;
  addressRoom?: string;
  address_room?: string;
}

interface RiderProfile {
  _id?: string;
  id?: string;
  name: string;
  phone?: string;
  vehicle?: string;
  riderPin?: string;
  isOnline?: boolean;
  createdAt?: string;
}

interface CrmConsoleProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredStudents: StudentProfile[];
  filteredRiders: RiderProfile[];
  allOrders: any[];
  setProfiles: React.Dispatch<React.SetStateAction<any[]>>;
  selectedUser: StudentProfile | null;
  setSelectedUser: (u: StudentProfile | null) => void;
  refundAmount: string;
  setRefundAmount: (amt: string) => void;
  refundReason: string;
  setRefundReason: (reason: string) => void;
  handleRefundSubmit: (e: React.FormEvent) => void;
}

export const CrmConsole: React.FC<CrmConsoleProps> = ({
  searchQuery,
  setSearchQuery,
  filteredStudents,
  filteredRiders,
  allOrders,
  setProfiles,
  selectedUser,
  setSelectedUser,
  refundAmount,
  setRefundAmount,
  refundReason,
  setRefundReason,
  handleRefundSubmit,
}) => {
  return (
    <div className="crm-container">
      <div className="crm-header-row">
        <div>
          <h3 className="crm-title">Student Profiles (CRM)</h3>
          <p className="crm-subtitle">Search students, check wallet balances, and issue refunds instantly.</p>
        </div>
        <div className="search-box-wrap">
          <Search size={16} style={{ color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Search student by name or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Student Table */}
      <div className="table-responsive">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Phone Number</th>
              <th>Address</th>
              <th>Active Plan</th>
              <th>Streak</th>
              <th>Wallet Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((profile) => (
              <tr key={profile._id || profile.id}>
                <td style={{ fontWeight: 600 }}>{profile.name || 'Student User'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{profile.email || profile.phone || 'N/A'}</td>
                <td style={{ fontSize: '13px' }}>
                  {profile.addressLine 
                    ? `${profile.addressLine}, ${profile.city || ''}, ${profile.state || ''} ${profile.pincode || ''}`
                    : (profile.addressHostel || profile.address_hostel
                      ? `${profile.addressHostel || profile.address_hostel}, Room ${profile.addressRoom || profile.address_room || ''}`
                      : 'Not set'
                    )}
                </td>
                <td>
                  <span className={`plan-badge ${profile.plan || 'none'}`}>
                    {profile.plan || 'None'}
                  </span>
                </td>
                <td>🔥 {profile.streak || 0}</td>
                <td>
                  <div className="wallet-balance-wrap">
                    {(() => {
                      const balance = Number(profile.walletBalance ?? profile.wallet_balance ?? profile.wallet_use ?? 0);
                      const isLow = balance < 90 && profile.plan !== 'none';
                      return (
                        <>
                          <span className={`wallet-balance ${isLow ? 'low' : 'good'}`}>
                            ₹{balance}
                          </span>
                          {isLow && (
                            <span className="low-balance-warning">
                              ⚠️ Low Balance (Needs Refill)
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="actions-cell-wrap">
                    <button 
                      onClick={() => setSelectedUser(profile)}
                      className="btn-refund"
                    >
                      💸 Issue Credit / Refund
                    </button>
                    <button 
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to delete student ${profile.name || 'this user'}? This action is permanent and cannot be undone.`)) {
                          try {
                            await api.delete(`/admin/users/${profile._id || profile.id}`);
                            setProfiles(prev => prev.filter(p => (p._id || p.id) !== (profile._id || profile.id)));
                            alert('Student profile deleted successfully.');
                          } catch (e: any) {
                            console.error('Delete user error:', e);
                            alert(`Failed to delete student: ${e.response?.data?.message || e.message}`);
                          }
                        }
                      }}
                      className="btn-delete-profile"
                      title="Delete Student Profile"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No students found matching query.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Riders Table Section */}
      <div style={{ marginTop: '20px' }}>
        <h3 className="crm-title" style={{ marginBottom: '10px' }}>Riders Registry (Fleet Crew)</h3>
        <div className="table-responsive">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Rider Name</th>
                <th>Phone Number</th>
                <th>Vehicle Number</th>
                <th>Login PIN</th>
                <th>Status</th>
                <th>Tiffin Recovery</th>
                <th>Completed Trips</th>
                <th>Registration Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRiders.map((rider) => {
                const rId = rider._id || rider.id;
                const riderOrders = allOrders.filter((o: any) => {
                  const assignedRiderId = o.rider?._id || o.rider?.id || o.rider;
                  return String(assignedRiderId) === String(rId);
                });
                const tiffinDeliveries = riderOrders.filter((o: any) => o.isTiffinOrder && o.status === 'delivered');
                const recoveredTiffins = tiffinDeliveries.filter((o: any) => o.emptyTiffinCollected).length;
                const recoveryRate = tiffinDeliveries.length > 0 
                  ? Math.round((recoveredTiffins / tiffinDeliveries.length) * 100) 
                  : 100;

                return (
                  <tr key={rId}>
                    <td style={{ fontWeight: 600 }}>{rider.name || 'Rider Partner'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{rider.phone || 'N/A'}</td>
                    <td style={{ fontWeight: 600, color: '#2563EB' }}>{rider.vehicle || 'Not Set'}</td>
                    <td style={{ fontWeight: 600 }}>🔑 {rider.riderPin || 'N/A'}</td>
                    <td>
                      <span className={`online-status-badge ${rider.isOnline !== false ? 'online' : 'offline'}`}>
                        {rider.isOnline !== false ? '🟢 Online' : '⚪ Offline'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: recoveryRate >= 80 ? '#10B981' : '#F59E0B' }}>
                      🔄 {recoveryRate}% ({recoveredTiffins}/{tiffinDeliveries.length})
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      🛵 {riderOrders.filter((o: any) => o.status === 'delivered').length} trips
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {rider.createdAt ? new Date(rider.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete rider ${rider.name || 'this rider'}? This action is permanent and cannot be undone.`)) {
                            try {
                              await api.delete(`/admin/users/${rider._id || rider.id}`);
                              setProfiles(prev => prev.filter(p => (p._id || p.id) !== (rider._id || rider.id)));
                              alert('Rider profile deleted successfully.');
                            } catch (e: any) {
                              console.error('Delete rider error:', e);
                              alert(`Failed to delete rider: ${e.response?.data?.message || e.message}`);
                            }
                          }
                        }}
                        className="btn-delete-profile"
                        style={{ marginLeft: 'auto' }}
                        title="Delete Rider Profile"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredRiders.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No riders registered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund dialog Modal */}
      {selectedUser && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div>
              <h3 className="modal-title">Issue Wallet Refund</h3>
              <p className="modal-subtitle">Add credits to {selectedUser.name}'s wallet immediately.</p>
            </div>
            
            <form onSubmit={handleRefundSubmit} className="modal-form">
              <div className="form-group-wrap">
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Refund Amount (₹)</label>
                <input 
                  type="number" 
                  value={refundAmount} 
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="form-input-number"
                  required
                />
              </div>

              <div className="form-group-wrap">
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Reason / Description</label>
                <select 
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="form-select-reason"
                >
                  <option value="Late Delivery">Late Delivery / Delay</option>
                  <option value="Poor Food Quality">Poor Food Quality / Feedback</option>
                  <option value="Tiffin Paused Refund">Vacation Pause Credit</option>
                  <option value="Promotional Gift">Special Promotional Gift</option>
                </select>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setSelectedUser(null)}
                  className="btn-modal-cancel"
                >Cancel</button>
                <button 
                  type="submit"
                  className="btn-modal-confirm"
                >Confirm Refund</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
