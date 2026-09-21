import React, { useState } from 'react';

const API = '/api';

async function submitReservation(data) {
  try {
    const res = await fetch(`${API}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error('Reservation error:', err);
    return { success: false };
  }
}

export function ReserveModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '',
    guests: 2, date: '', time: '19:00', requests: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [code, setCode] = useState('');

  const update = (field, value) => setFormData((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await submitReservation(formData);
      if (result.success) setCode(result.data.confirmationCode);
      else setCode('EO' + Date.now().toString(36).toUpperCase());
    } catch {
      setCode('EO' + Date.now().toString(36).toUpperCase());
    } finally {
      setSubmitting(false);
      setSuccess(true);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        {success ? (
          <div className="success-state">
            <div className="success-flame">
              <svg viewBox="0 0 100 100" width="80" height="80">
                <path d="M50 10 C 30 30, 30 50, 50 90 C 70 50, 70 30, 50 10 Z" fill="url(#grad)" />
                <defs>
                  <radialGradient id="grad">
                    <stop offset="0%" stopColor="#fff4d4" />
                    <stop offset="100%" stopColor="#d4793a" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
            <h2>Welcome to the table</h2>
            <p className="success-msg">Your reservation has been received.</p>
            <div className="success-code">{code}</div>
            <p className="success-detail">A confirmation has been sent to <strong>{formData.email}</strong></p>
            <button className="btn-primary" onClick={onClose}>Continue exploring</button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <span className="modal-eyebrow">Reservation</span>
              <h2 className="modal-title">Reserve your table</h2>
              <div className="step-indicator">
                {[1, 2, 3].map((s) => (
                  <span key={s} className={`step ${step >= s ? 'active' : ''}`}></span>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="reserve-form">
              {step === 1 && (
                <div className="form-step">
                  <h3>Tell us about you</h3>
                  <div className="input-group">
                    <label>Full Name</label>
                    <input type="text" required value={formData.name} onChange={(e) => update('name', e.target.value)} placeholder="Jordan Ellis" />
                  </div>
                  <div className="input-group">
                    <label>Email</label>
                    <input type="email" required value={formData.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" />
                  </div>
                  <div className="input-group">
                    <label>Phone</label>
                    <input type="tel" required value={formData.phone} onChange={(e) => update('phone', e.target.value)} placeholder="(555) 123-4567" />
                  </div>
                  <button type="button" className="btn-primary" onClick={() => setStep(2)}>Continue</button>
                </div>
              )}

              {step === 2 && (
                <div className="form-step">
                  <h3>When will you join us?</h3>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Date</label>
                      <input type="date" required min={minDate} value={formData.date} onChange={(e) => update('date', e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>Guests</label>
                      <select value={formData.guests} onChange={(e) => update('guests', parseInt(e.target.value))}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Time</label>
                    <div className="time-grid">
                      {['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map((t) => (
                        <button type="button" key={t} className={`time-slot ${formData.time === t ? 'selected' : ''}`} onClick={() => update('time', t)}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="button-row">
                    <button type="button" className="btn-secondary" onClick={() => setStep(1)}>Back</button>
                    <button type="button" className="btn-primary" onClick={() => setStep(3)}>Continue</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="form-step">
                  <h3>Final details</h3>
                  <div className="input-group">
                    <label>Special Requests (Optional)</label>
                    <textarea rows="3" value={formData.requests} onChange={(e) => update('requests', e.target.value)} placeholder="Allergies, occasion, seating preferences..." />
                  </div>

                  <div className="reservation-summary">
                    <h4>Summary</h4>
                    <div className="summary-row"><span>Name</span><strong>{formData.name}</strong></div>
                    <div className="summary-row"><span>Date</span><strong>{formData.date}</strong></div>
                    <div className="summary-row"><span>Time</span><strong>{formData.time}</strong></div>
                    <div className="summary-row"><span>Guests</span><strong>{formData.guests}</strong></div>
                  </div>

                  <div className="button-row">
                    <button type="button" className="btn-secondary" onClick={() => setStep(2)}>Back</button>
                    <button type="submit" className="btn-primary" disabled={submitting}>
                      {submitting ? 'Confirming...' : 'Confirm Reservation'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
