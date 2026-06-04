import React, { useState } from 'react';
import { api } from '../lib/api';
import './RidersManagementView.css';

interface RidersManagementViewProps {
  profiles: any[];
  orders: any[];
  loadAllData: () => void;
}

export const RidersManagementView: React.FC<RidersManagementViewProps> = ({ profiles, orders, loadAllData }) => {
  const ridersList = profiles.filter(p => p.role === 'rider');
  
  // Stats
  const totalRiders = ridersList.length;
  const onlineRiders = ridersList.filter(r => r.isOnline !== false).length;
  
  // Calculate total deliveries handled by riders today
  const tiffinDeliveriesToday = orders.filter(o => o.isTiffinOrder && o.status === 'delivered').length;
  const restaurantDeliveriesToday = orders.filter(o => o.restaurant && o.status === 'delivered').length;
  const totalDeliveriesToday = tiffinDeliveriesToday + restaurantDeliveriesToday;

  // State for creating new rider
  const [showAddRider, setShowAddRider] = useState(false);
  const [newRiderName, setNewRiderName] = useState('');
  const [newRiderPhone, setNewRiderPhone] = useState('');
  const [newRiderEmail, setNewRiderEmail] = useState('');
  const [newRiderPassword, setNewRiderPassword] = useState('');
  const [newRiderVehicle, setNewRiderVehicle] = useState('');
  const [newRiderPin, setNewRiderPin] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for editing rider
  const [editingRiderId, setEditingRiderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editVehicle, setEditVehicle] = useState('');
  const [editPin, setEditPin] = useState('');

  const handleAddRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiderName || !newRiderPassword) {
      setFormError('Name and Password are required');
      return;
    }
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);
    try {
      const { data } = await api.post('/admin/users', {
        name: newRiderName,
        phone: newRiderPhone || undefined,
        email: newRiderEmail || undefined,
        password: newRiderPassword,
        role: 'rider',
        vehicle: newRiderVehicle,
        riderPin: newRiderPin
      });
      if (data.success) {
        setFormSuccess('Rider created successfully!');
        setNewRiderName('');
        setNewRiderPhone('');
        setNewRiderEmail('');
        setNewRiderPassword('');
        setNewRiderVehicle('');
        setNewRiderPin('');
        loadAllData();
        setTimeout(() => setShowAddRider(false), 1500);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create rider');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleOnlineStatus = async (riderId: string, currentStatus: boolean) => {
    try {
      const { data } = await api.put(`/admin/users/${riderId}`, {
        isOnline: !currentStatus
      });
      if (data.success) {
        loadAllData();
      }
    } catch (err) {
      console.error('Failed to toggle online status:', err);
    }
  };

  const handleSaveEdit = async (riderId: string) => {
    try {
      const { data } = await api.put(`/admin/users/${riderId}`, {
        name: editName,
        phone: editPhone,
        vehicle: editVehicle,
        riderPin: editPin
      });
      if (data.success) {
        setEditingRiderId(null);
        loadAllData();
      }
    } catch (err) {
      console.error('Failed to update rider:', err);
    }
  };

  const startEditing = (rider: any) => {
    setEditingRiderId(rider._id || rider.id);
    setEditName(rider.name);
    setEditPhone(rider.phone || '');
    setEditVehicle(rider.vehicle || '');
    setEditPin(rider.riderPin || '');
  };

  const handleDeleteRider = async (riderId: string) => {
    if (!window.confirm('Are you sure you want to remove this rider?')) return;
    try {
      const { data } = await api.delete(`/admin/users/${riderId}`);
      if (data.success) {
        loadAllData();
      }
    } catch (err) {
      console.error('Failed to delete rider:', err);
    }
  };

  return (
    <div className="riders-container">
      
      {/* Header and Add Button */}
      <div className="riders-header">
        <div>
          <h2 className="riders-title">🛵 Riders Section & Management</h2>
          <p className="riders-subtitle">
            Register new delivery personnel, track status, edit vehicle numbers, and verify pins.
          </p>
        </div>
        <button
          onClick={() => setShowAddRider(!showAddRider)}
          className="btn-register"
        >
          {showAddRider ? '✕ Close Form' : '➕ Register New Rider'}
        </button>
      </div>

      {/* Add Rider Form Section */}
      {showAddRider && (
        <div className="form-container">
          <h3 className="form-title">📝 Register New Rider Profile</h3>
          {formError && <p className="form-error">⚠️ {formError}</p>}
          {formSuccess && <p className="form-success">✓ {formSuccess}</p>}
          
          <form onSubmit={handleAddRider} className="form-layout">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newRiderName}
                  onChange={(e) => setNewRiderName(e.target.value)}
                  placeholder="Rider's full name"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  required
                  value={newRiderPassword}
                  onChange={(e) => setNewRiderPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  value={newRiderPhone}
                  onChange={(e) => setNewRiderPhone(e.target.value)}
                  placeholder="+91 9988776655"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email (Username)</label>
                <input
                  type="email"
                  value={newRiderEmail}
                  onChange={(e) => setNewRiderEmail(e.target.value)}
                  placeholder="rider@tiffin.com"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Vehicle Number</label>
                <input
                  type="text"
                  value={newRiderVehicle}
                  onChange={(e) => setNewRiderVehicle(e.target.value)}
                  placeholder="e.g. MP 09 AB 1234"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Rider Pin (Delivery Check)</label>
                <input
                  type="text"
                  value={newRiderPin}
                  onChange={(e) => setNewRiderPin(e.target.value)}
                  placeholder="e.g. 4321"
                  maxLength={6}
                  className="form-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-submit"
            >
              {isSubmitting ? 'Creating Rider Account...' : '✓ Create Rider Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Stats Counter Section */}
      <div className="stats-grid">
        <div className="stats-card">
          <span className="stats-card-label">Total Registered Riders</span>
          <h3 className="stats-card-val" style={{ color: 'var(--primary)' }}>{totalRiders}</h3>
        </div>
        <div className="stats-card">
          <span className="stats-card-label">Online & Active Riders</span>
          <h3 className="stats-card-val" style={{ color: 'var(--accent-green)' }}>{onlineRiders}</h3>
        </div>
        <div className="stats-card">
          <span className="stats-card-label">Total Deliveries Handled (Today)</span>
          <h3 className="stats-card-val" style={{ color: 'var(--accent-blue)' }}>{totalDeliveriesToday}</h3>
        </div>
      </div>

      {/* Grid of Riders */}
      <div className="fleet-container">
        <h3 className="fleet-title">👥 Active Fleet List</h3>
        
        {ridersList.length === 0 ? (
          <p className="fleet-empty">No riders registered yet. Use the form above to add some!</p>
        ) : (
          <div className="fleet-grid">
            {ridersList.map((rider) => {
              const id = rider._id || rider.id;
              const isEditing = editingRiderId === id;
              const isOnline = rider.isOnline !== false;

              return (
                <div key={id} className="fleet-card">
                  
                  {/* Status Indicator */}
                  <div className="status-indicator">
                    <div className="status-label-wrap">
                      <span className="status-dot" style={{ backgroundColor: isOnline ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                      <span className="status-text" style={{ color: isOnline ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleOnlineStatus(id, isOnline)}
                      className="btn-toggle-online"
                      style={{
                        backgroundColor: isOnline ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        color: isOnline ? 'var(--accent-red)' : 'var(--accent-green)'
                      }}
                    >
                      {isOnline ? 'Go Offline' : 'Go Online'}
                    </button>
                  </div>

                  {/* Rider Details */}
                  {isEditing ? (
                    <div className="edit-mode-wrap">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Rider Name"
                        className="edit-input"
                      />
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Rider Phone"
                        className="edit-input"
                      />
                      <input
                        type="text"
                        value={editVehicle}
                        onChange={(e) => setEditVehicle(e.target.value)}
                        placeholder="Vehicle Number"
                        className="edit-input"
                      />
                      <input
                        type="text"
                        value={editPin}
                        onChange={(e) => setEditPin(e.target.value)}
                        placeholder="Confirmation PIN"
                        className="edit-input"
                      />

                      <div className="edit-actions">
                        <button onClick={() => handleSaveEdit(id)} className="btn-save">Save</button>
                        <button onClick={() => setEditingRiderId(null)} className="btn-cancel">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="view-mode-wrap">
                      <h4 className="rider-name">🧑‍🦱 {rider.name}</h4>
                      <p className="rider-phone">📞 {rider.phone || 'No phone added'}</p>
                      <p className="rider-email">✉ {rider.email || 'No email'}</p>
                      
                      <div className="rider-metadata">
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Vehicle:</span> <span style={{ fontWeight: 600 }}>🛵 {rider.vehicle || 'N/A'}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>PIN Code:</span> <span style={{ fontWeight: 600 }}>🔑 {rider.riderPin || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="rider-actions">
                        <button
                          onClick={() => startEditing(rider)}
                          className="btn-edit-info"
                        >
                          ✎ Edit Info
                        </button>
                        <button
                          onClick={() => handleDeleteRider(id)}
                          className="btn-remove-rider"
                        >
                          🗑 Remove
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
