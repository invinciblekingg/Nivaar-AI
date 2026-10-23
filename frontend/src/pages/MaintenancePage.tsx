import React, { useState, useEffect } from 'react';
import { 
  Wrench, Plus, CheckCircle, Clock, AlertTriangle, 
  User, Calendar, Filter, ArrowRight, X, ShieldAlert
} from 'lucide-react';
import { MaintenanceTask, Machine } from '../types';
import { api } from '../services/api';

interface MaintenancePageProps {
  machines: Machine[];
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({ machines }) => {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newMachineId, setNewMachineId] = useState(machines[0]?.id || '');
  const [newPriority, setNewPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [newAssignee, setNewAssignee] = useState('Lead Maintenance Tech');
  const [newDescription, setNewDescription] = useState('');
  const [newRiskScore, setNewRiskScore] = useState(75);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getMaintenanceTasks(selectedStatus, selectedPriority);
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [selectedStatus, selectedPriority]);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newMachineId) return;

    try {
      await api.createMaintenanceTask({
        machine_id: newMachineId,
        title: newTitle,
        priority: newPriority,
        assignee: newAssignee,
        description: newDescription,
        risk_score: newRiskScore
      });
      setIsModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      loadTasks();
    } catch (err: any) {
      alert(err.message || 'Error creating task');
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: any) => {
    try {
      await api.updateMaintenanceTask(taskId, {
        status: newStatus as any,
        audit_note: `Manual technician transition to ${newStatus}`
      });
      loadTasks();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-[#FF7A00]" />
            <span>Predictive Maintenance Work Orders</span>
          </h1>
          <p className="text-xs text-slate-400">
            Actionable work order dispatching, physical technician assignment, explainable risk ranking, and audit trails
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#FF5E1E] to-[#FF7A00] text-[#0F1115] font-bold text-xs hover:brightness-110 shadow-[0_0_20px_rgba(255,94,30,0.35)] transition-all self-start sm:self-auto min-h-[38px] touch-target-min"
        >
          <Plus className="w-4 h-4" />
          <span>Create Work Order</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400">Status:</span>
          {['All', 'OPEN', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              aria-label={`Filter by status: ${s}`}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold min-h-[32px] transition-all ${
                selectedStatus === s
                  ? 'bg-[#FF5E1E] text-[#0F1115] font-bold'
                  : 'bg-[#1C2028] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-400">Priority:</span>
          {['All', 'CRITICAL', 'HIGH', 'MEDIUM'].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPriority(p)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                selectedPriority === p
                  ? 'bg-[#251A14] text-[#FF7A00] font-semibold border border-[#FF5E1E]/40'
                  : 'bg-[#1C2028] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div 
            key={task.id}
            className="glass-card p-5 hover:border-[#FF5E1E]/40 transition-all space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    task.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[#2A1810] text-[#FF5E1E] border border-[#FF5E1E]/40'
                  }`}>
                    {task.priority} PRIORITY
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Risk Score: <strong className="text-white">{task.risk_score}</strong>/100
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1.5">{task.title}</h3>
                <span className="text-xs text-[#FF7A00] font-semibold">{task.machine_name}</span>
              </div>

              {/* Status Switcher */}
              <div className="flex items-center space-x-1.5 self-start sm:self-auto">
                {['OPEN', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(task.id, st)}
                    aria-label={`Mark task status as ${st}`}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                      task.status === st
                        ? st === 'COMPLETED'
                          ? 'bg-emerald-500 text-white'
                          : st === 'IN_PROGRESS'
                          ? 'bg-[#FF5E1E] text-[#0F1115] font-bold'
                          : 'bg-slate-700 text-white'
                        : 'bg-[#1C2028] text-slate-500 hover:text-slate-300 border border-white/5'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{task.description}</p>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5 gap-2">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Assignee: <strong className="text-slate-200">{task.assignee}</strong></span>
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                </span>
              </div>

              {task.audit_trail && task.audit_trail.length > 0 && (
                <span className="font-mono text-[10px] text-slate-500">
                  Last audit: {task.audit_trail[task.audit_trail.length - 1].action}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#161920] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 id="maintenance-modal-title" className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-[#FF7A00]" />
                <span>Issue Predictive Maintenance Ticket</span>
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                aria-label="Close dialog"
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label htmlFor="work-order-target-equipment" className="block text-slate-400 mb-1">Target Equipment</label>
                <select
                  id="work-order-target-equipment"
                  aria-label="Target Equipment"
                  value={newMachineId}
                  onChange={(e) => setNewMachineId(e.target.value)}
                  className="w-full p-2 bg-[#1C2028] border border-white/10 rounded text-white focus:outline-none focus:border-[#FF5E1E]"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="work-order-title" className="block text-slate-400 mb-1">Work Order Title</label>
                <input
                  id="work-order-title"
                  type="text"
                  required
                  placeholder="e.g. Bearing ultrasound lubrication verification"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  aria-label="Work Order Title"
                  className="w-full p-2 bg-[#1C2028] border border-white/10 rounded text-white focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="work-order-priority" className="block text-slate-400 mb-1">Priority Tier</label>
                  <select
                    id="work-order-priority"
                    aria-label="Priority Tier"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2 bg-[#1C2028] border border-white/10 rounded text-white focus:outline-none focus:border-[#FF5E1E]"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="work-order-assignee" className="block text-slate-400 mb-1">Assigned Technician</label>
                  <input
                    id="work-order-assignee"
                    type="text"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    aria-label="Assigned Technician"
                    className="w-full p-2 bg-[#1C2028] border border-white/10 rounded text-white focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="work-order-instructions" className="block text-slate-400 mb-1">Inspection Instructions & Scope</label>
                <textarea
                  id="work-order-instructions"
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Specific physical inspection steps, torque specs, or grease sampling instructions..."
                  aria-label="Inspection Instructions and Scope"
                  className="w-full p-2 bg-[#1C2028] border border-white/10 rounded text-white focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#1C2028] text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#FF5E1E] to-[#FF7A00] text-[#0F1115] font-bold hover:brightness-110 shadow-md min-h-[38px] touch-target-min"
                >
                  Issue Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
