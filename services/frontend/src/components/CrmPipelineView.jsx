import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, FileText, Check, X, Award } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

const PIPELINE_STAGES = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'NEGOTIATING', 'CONTRACT', 'CLOSED'];

export default function CrmPipelineView({ onSelectLead }) {
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null); // Item currently being edited in modal
  const [notes, setNotes] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [status, setStatus] = useState('NEW');

  useEffect(() => {
    fetchPipeline();
  }, []);

  async function fetchPipeline() {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/crm/pipeline`);
      const data = await res.json();
      
      // For each item, let's fetch its lead detail to get details like score & tier
      const list = data.pipeline || [];
      const enrichedList = await Promise.all(list.map(async (item) => {
        try {
          const detailRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads/${item.leadId}`);
          const detail = await detailRes.json();
          return {
            ...item,
            opportunityScore: detail.score?.opportunityScore || 0,
            tier: detail.score?.tier || 'C'
          };
        } catch {
          return { ...item, opportunityScore: 0, tier: 'C' };
        }
      }));

      setPipeline(enrichedList);
    } catch (err) {
      console.error('Error fetching pipeline:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMoveStage(crmRecordId, currentStage, direction) {
    const currentIndex = PIPELINE_STAGES.indexOf(currentStage);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= PIPELINE_STAGES.length) return;

    const nextStage = PIPELINE_STAGES[nextIndex];
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/crm/pipeline/${crmRecordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStage })
      });
      const data = await res.json();
      if (data.success) {
        // Optimistically update UI
        setPipeline(prev => prev.map(item => 
          item.crmRecordId === crmRecordId ? { ...item, status: nextStage } : item
        ));
      }
    } catch (err) {
      console.error('Error updating stage:', err);
    }
  }

  function handleOpenModal(item) {
    setSelectedItem(item);
    setNotes(item.notes || '');
    setOfferAmount(item.offerAmount || '');
    setStatus(item.status);
  }

  async function handleSaveDetails(e) {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/crm/pipeline/${selectedItem.crmRecordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes,
          offerAmount: offerAmount ? parseFloat(offerAmount) : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedItem(null);
        fetchPipeline(); // Refresh board
      } else {
        alert('Failed to save CRM updates.');
      }
    } catch (err) {
      console.error('Error saving crm item:', err);
      alert('Error updating CRM pipeline record.');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {loading && pipeline.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading active pipeline board...</p>
      ) : (
        <div className="kanban-board">
          {PIPELINE_STAGES.map(stage => {
            const items = pipeline.filter(item => item.status === stage);
            return (
              <div key={stage} className="kanban-column">
                <div className="kanban-column-header">
                  <span className="column-title">
                    {stage.replace('_', ' ')}
                  </span>
                  <span className="column-counter">{items.length}</span>
                </div>

                <div className="kanban-cards-container">
                  {items.map(item => {
                    let tierColor = 'var(--tier-c)';
                    if (item.tier === 'A_PLUS') tierColor = 'var(--tier-a-plus)';
                    else if (item.tier === 'A') tierColor = 'var(--tier-a)';
                    else if (item.tier === 'B') tierColor = 'var(--tier-b)';

                    return (
                      <div key={item.crmRecordId} className="kanban-card" onClick={() => handleOpenModal(item)}>
                        {/* Tier indicator bar */}
                        <div className="card-tier-line" style={{ backgroundColor: tierColor }} />
                        
                        <span className="card-address">{item.propertyAddress}</span>
                        
                        <div className="card-metrics">
                          <span>Opp Score: {item.opportunityScore}</span>
                          <span style={{ color: tierColor, fontWeight: 700 }}>Tier {item.tier?.replace('_', '+')}</span>
                        </div>

                        {item.offerAmount && (
                          <div className="card-offer">
                            Offer: ${parseFloat(item.offerAmount).toLocaleString()}
                          </div>
                        )}

                        <div className="card-footer" onClick={(e) => e.stopPropagation()}>
                          <button className="progress-btn" title="View details" onClick={() => onSelectLead(item.leadId)}>
                            <FileText size={12} />
                          </button>
                          
                          <div className="card-progress-buttons">
                            <button 
                              className="progress-btn" 
                              onClick={() => handleMoveStage(item.crmRecordId, item.status, -1)}
                              disabled={stage === PIPELINE_STAGES[0]}
                            >
                              <ArrowLeft size={11} />
                            </button>
                            <button 
                              className="progress-btn"
                              onClick={() => handleMoveStage(item.crmRecordId, item.status, 1)}
                              disabled={stage === PIPELINE_STAGES[PIPELINE_STAGES.length - 1]}
                            >
                              <ArrowRight size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit CRM Card details modal */}
      {selectedItem && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleSaveDetails}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Pipeline Progress</h3>
              <button type="button" className="drawer-close" onClick={() => setSelectedItem(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>Property:</strong> {selectedItem.propertyAddress}
              </div>

              <div className="filter-group">
                <label className="filter-label">Pipeline Stage</label>
                <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {PIPELINE_STAGES.map(st => (
                    <option key={st} value={st}>{st.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Cash Offer Amount ($)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="e.g. 265000"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Acquisitions Logger & Notes</label>
                <textarea 
                  className="form-input" 
                  rows="4" 
                  placeholder="Log negotiations, seller constraints, callbacks, or deed issues..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedItem(null)}>Cancel</button>
              <button type="submit" className="btn">
                <Check size={16} />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
