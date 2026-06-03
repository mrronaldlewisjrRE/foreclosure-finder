import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Plus, CheckCircle, Phone, Mail, MessageSquare, StickyNote, Clock, FileText, ChevronRight, X, RefreshCw, AlertCircle } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

const ACQUISITION_STAGES = [
  { id: 'New Lead', color: 'var(--accent)' },
  { id: 'Contact Attempted', color: 'var(--cyan)' },
  { id: 'Follow Up', color: 'var(--amber)' },
  { id: 'Negotiating', color: 'var(--purple)' },
  { id: 'Appointment Set', color: '#f97316' },
  { id: 'Under Contract', color: 'var(--emerald)' },
];

const COMM_TYPES = [
  { id: 'CALL', label: 'Call', icon: Phone },
  { id: 'TEXT', label: 'Text', icon: MessageSquare },
  { id: 'EMAIL', label: 'Email', icon: Mail },
  { id: 'NOTE', label: 'Note', icon: StickyNote },
];

export default function AcquisitionCenterView({ onSelectLead }) {
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailTab, setDetailTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [comms, setComms] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [commType, setCommType] = useState('NOTE');
  const [commContent, setCommContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/acquisition/pipeline`);
      const data = await res.json();
      setPipeline(data.pipeline || []);
    } catch (err) {
      console.error('Error fetching acquisition pipeline:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  async function handleMoveStage(item, direction) {
    const currentIdx = ACQUISITION_STAGES.findIndex(s => s.id === item.pipelineStage);
    const nextIdx = currentIdx + direction;
    if (nextIdx < 0 || nextIdx >= ACQUISITION_STAGES.length) return;

    const nextStage = ACQUISITION_STAGES[nextIdx].id;
    try {
      await fetchWithAuth(`${API_BASE_URL}/api/v1/acquisition/pipeline/${item.crmRecordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStage: nextStage }),
      });
      setPipeline(prev => prev.map(p =>
        p.crmRecordId === item.crmRecordId ? { ...p, pipelineStage: nextStage } : p
      ));
      if (selectedItem?.crmRecordId === item.crmRecordId) {
        setSelectedItem({ ...selectedItem, pipelineStage: nextStage });
      }
    } catch (err) {
      console.error('Error moving stage:', err);
    }
  }

  async function openDetail(item) {
    setSelectedItem(item);
    setDetailTab('tasks');
    // Fetch tasks and comms
    try {
      const [taskRes, commRes] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/api/v1/acquisition/lead/${item.crmRecordId}/tasks`),
        fetchWithAuth(`${API_BASE_URL}/api/v1/acquisition/lead/${item.crmRecordId}/comms`),
      ]);
      const taskData = await taskRes.json();
      const commData = await commRes.json();
      setTasks(taskData.tasks || []);
      setComms(commData.communications || []);
    } catch (err) {
      console.error('Error fetching detail:', err);
    }
  }

  async function handleToggleTask(taskId, currentStatus) {
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await fetchWithAuth(`${API_BASE_URL}/api/v1/acquisition/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error('Error updating task:', err);
    }
  }

  async function handleAddTask(e) {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedItem) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/acquisition/lead/${selectedItem.crmRecordId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle.trim() }),
      });
      const data = await res.json();
      if (data.task) setTasks(prev => [...prev, data.task]);
      setNewTaskTitle('');
    } catch (err) {
      console.error('Error adding task:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComm(e) {
    e.preventDefault();
    if (!commContent.trim() || !selectedItem) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/acquisition/lead/${selectedItem.crmRecordId}/comms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: commType, content: commContent.trim() }),
      });
      const data = await res.json();
      if (data.communication) setComms(prev => [data.communication, ...prev]);
      setCommContent('');
    } catch (err) {
      console.error('Error adding comm:', err);
    } finally {
      setSaving(false);
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const tierBadge = (tier) => {
    const colors = { A_PLUS: 'var(--emerald)', A: 'var(--accent)', B: 'var(--amber)', C: 'var(--text-muted)' };
    const labels = { A_PLUS: 'A+', A: 'A', B: 'B', C: 'C' };
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '22px', height: '22px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
        background: `${colors[tier] || colors.C}20`, color: colors[tier] || colors.C,
      }}>
        {labels[tier] || 'C'}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <RefreshCw size={24} className="spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="acquisition-center">
      {/* Kanban Board */}
      <div className="acq-kanban-wrapper">
        <div className="acq-kanban-board">
          {ACQUISITION_STAGES.map(stage => {
            const items = pipeline.filter(p => (p.pipelineStage || 'New Lead') === stage.id);
            return (
              <div key={stage.id} className="acq-kanban-column">
                <div className="acq-kanban-col-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color }} />
                    <span className="acq-kanban-col-title">{stage.id}</span>
                  </div>
                  <span className="acq-kanban-col-count">{items.length}</span>
                </div>

                <div className="acq-kanban-col-body">
                  {items.map(item => (
                    <div
                      key={item.crmRecordId}
                      className="acq-kanban-card"
                      onClick={() => openDetail(item)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span className="acq-card-address">{item.propertyStreet || item.propertyAddress}</span>
                        {tierBadge(item.score?.tier)}
                      </div>
                      <span className="acq-card-city">
                        {item.propertyCity}, {item.propertyState}
                      </span>
                      <div className="acq-card-meta">
                        <span className="acq-card-meta-item">
                          <FileText size={11} />
                          {item.filingType?.replace(/_/g, ' ') || 'Distressed'}
                        </span>
                        {item.pendingTasks > 0 && (
                          <span className="acq-card-meta-item" style={{ color: 'var(--amber)' }}>
                            <Clock size={11} />
                            {item.pendingTasks} task{item.pendingTasks > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="acq-card-actions">
                        <button
                          className="acq-move-btn"
                          onClick={(e) => { e.stopPropagation(); handleMoveStage(item, -1); }}
                          disabled={ACQUISITION_STAGES.findIndex(s => s.id === item.pipelineStage) === 0}
                          title="Move Back"
                        >
                          <ArrowLeft size={12} />
                        </button>
                        <button
                          className="acq-move-btn"
                          onClick={(e) => { e.stopPropagation(); handleMoveStage(item, 1); }}
                          disabled={ACQUISITION_STAGES.findIndex(s => s.id === item.pipelineStage) === ACQUISITION_STAGES.length - 1}
                          title="Move Forward"
                        >
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="acq-kanban-empty">No leads</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Panel Overlay */}
      {selectedItem && (
        <>
          <div className="acq-detail-overlay" onClick={() => setSelectedItem(null)} />
          <div className="acq-detail-panel">
            <div className="acq-detail-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                  {selectedItem.propertyStreet || selectedItem.propertyAddress}
                </h3>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  {selectedItem.propertyCity}, {selectedItem.propertyState} {selectedItem.propertyZip} • {selectedItem.countyCode}
                </p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="acq-detail-close">
                <X size={18} />
              </button>
            </div>

            {/* Stage Badge */}
            <div style={{ padding: '0 20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {ACQUISITION_STAGES.map(stage => (
                  <span
                    key={stage.id}
                    style={{
                      padding: '3px 10px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 600,
                      background: selectedItem.pipelineStage === stage.id ? stage.color : 'var(--bg-tertiary)',
                      color: selectedItem.pipelineStage === stage.id ? '#fff' : 'var(--text-muted)',
                      cursor: 'pointer', transition: 'var(--transition-fast)',
                    }}
                    onClick={async () => {
                      await fetchWithAuth(`${API_BASE_URL}/api/v1/acquisition/pipeline/${selectedItem.crmRecordId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pipelineStage: stage.id }),
                      });
                      setSelectedItem({ ...selectedItem, pipelineStage: stage.id });
                      setPipeline(prev => prev.map(p =>
                        p.crmRecordId === selectedItem.crmRecordId ? { ...p, pipelineStage: stage.id } : p
                      ));
                    }}
                  >
                    {stage.id}
                  </span>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="acq-detail-tabs">
              {['tasks', 'comms'].map(tab => (
                <button
                  key={tab}
                  className={`acq-detail-tab ${detailTab === tab ? 'active' : ''}`}
                  onClick={() => setDetailTab(tab)}
                >
                  {tab === 'tasks' ? 'Tasks' : 'Communication Log'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="acq-detail-content">
              {detailTab === 'tasks' && (
                <>
                  {/* Add Task */}
                  <form onSubmit={handleAddTask} className="acq-add-form">
                    <input
                      type="text"
                      placeholder="Add a new task..."
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      className="acq-add-input"
                    />
                    <button type="submit" className="acq-add-btn" disabled={saving || !newTaskTitle.trim()}>
                      <Plus size={14} />
                    </button>
                  </form>

                  {/* Task List */}
                  <div className="acq-task-list">
                    {tasks.map(task => (
                      <div key={task.id} className="acq-task-item">
                        <button
                          className={`acq-task-check ${task.status === 'COMPLETED' ? 'completed' : ''}`}
                          onClick={() => handleToggleTask(task.id, task.status)}
                        >
                          <CheckCircle size={16} />
                        </button>
                        <div className="acq-task-info">
                          <span className={`acq-task-title ${task.status === 'COMPLETED' ? 'done' : ''}`}>
                            {task.title}
                          </span>
                          {task.dueAt && (
                            <span className="acq-task-due">
                              <Clock size={10} /> Due {formatDate(task.dueAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {tasks.length === 0 && (
                      <div className="acq-empty-msg">No tasks yet. Add one above.</div>
                    )}
                  </div>
                </>
              )}

              {detailTab === 'comms' && (
                <>
                  {/* Add Communication */}
                  <form onSubmit={handleAddComm} className="acq-comm-form">
                    <div className="acq-comm-type-row">
                      {COMM_TYPES.map(ct => {
                        const Icon = ct.icon;
                        return (
                          <button
                            key={ct.id}
                            type="button"
                            className={`acq-comm-type-btn ${commType === ct.id ? 'active' : ''}`}
                            onClick={() => setCommType(ct.id)}
                          >
                            <Icon size={13} />
                            {ct.label}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder={`Log a ${commType.toLowerCase()} note...`}
                        value={commContent}
                        onChange={e => setCommContent(e.target.value)}
                        className="acq-add-input"
                      />
                      <button type="submit" className="acq-add-btn" disabled={saving || !commContent.trim()}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </form>

                  {/* Communication Timeline */}
                  <div className="acq-comm-list">
                    {comms.map(comm => {
                      const typeInfo = COMM_TYPES.find(ct => ct.id === comm.type) || COMM_TYPES[3];
                      const Icon = typeInfo.icon;
                      return (
                        <div key={comm.id} className="acq-comm-item">
                          <div className="acq-comm-icon">
                            <Icon size={14} />
                          </div>
                          <div className="acq-comm-body">
                            <div className="acq-comm-meta">
                              <span className="acq-comm-type-label">{typeInfo.label}</span>
                              <span className="acq-comm-time">{formatDate(comm.createdAt)}</span>
                            </div>
                            <p className="acq-comm-content">{comm.content}</p>
                          </div>
                        </div>
                      );
                    })}
                    {comms.length === 0 && (
                      <div className="acq-empty-msg">No communications logged yet.</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
