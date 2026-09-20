import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  RefreshCw,
  AlertTriangle,
  Edit3,
  Trash2,
  X,
  Check,
  ToggleLeft,
  ToggleRight,
  Cpu,
  MemoryStick,
  HardDrive,
  Bot,
} from 'lucide-react';
import api from '../../lib/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  ram: number;
  cpu: number;
  storage: number;
  maxBots: number;
  active: boolean;
}

const emptyPlan: Omit<Plan, 'id'> = {
  name: '',
  price: 0,
  ram: 256,
  cpu: 50,
  storage: 1024,
  maxBots: 3,
  active: true,
};

const AdminPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPlan);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/plans');
      setPlans(data.plans || data);
    } catch (err: any) {
      setError(err.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreate = async () => {
    setActingId('create');
    try {
      const data = await api.post('/plans', form);
      setPlans((prev) => [...prev, data.plan || data]);
      setShowCreate(false);
      setForm(emptyPlan);
    } catch (err: any) {
      setError(err.message || 'Failed to create plan');
    } finally {
      setActingId(null);
    }
  };

  const handleUpdate = async (id: string) => {
    setActingId(id);
    try {
      await api.put(`/plans/${id}`, form);
      setPlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...form } : p))
      );
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update plan');
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this plan?')) return;
    setActingId(id);
    try {
      await api.delete(`/plans/${id}`);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete plan');
    } finally {
      setActingId(null);
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    setActingId(plan.id);
    try {
      await api.put(`/plans/${plan.id}`, { active: !plan.active });
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, active: !p.active } : p))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to toggle plan');
    } finally {
      setActingId(null);
    }
  };

  const startEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      price: plan.price,
      ram: plan.ram,
      cpu: plan.cpu,
      storage: plan.storage,
      maxBots: plan.maxBots,
      active: plan.active,
    });
  };

  const formatStorage = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
    return `${mb} MB`;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Plans</h1>
          <p className="mt-1 text-gray-400">Manage subscription plans.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPlans}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setShowCreate(true); setEditingId(null); setForm(emptyPlan); }}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add Plan
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto hover:text-red-300">x</button>
        </div>
      )}

      {showCreate && (
        <div className="rounded-xl border border-indigo-500/20 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Create New Plan</h2>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <PlanForm form={form} setForm={setForm} />
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={actingId === 'create' || !form.name}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {actingId === 'create' ? 'Creating...' : 'Create Plan'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-400 hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {plans.length === 0 && !showCreate ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm">
          <CreditCard className="mx-auto h-12 w-12 text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-white">No plans</h3>
          <p className="mt-2 text-sm text-gray-400">Create a plan to offer to users.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border bg-white/5 p-6 backdrop-blur-sm ${
                plan.active ? 'border-white/10' : 'border-white/5 opacity-60'
              }`}
            >
              {editingId === plan.id ? (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Edit Plan</h3>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-white">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <PlanForm form={form} setForm={setForm} />
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleUpdate(plan.id)}
                      disabled={actingId === plan.id}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      {actingId === plan.id ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-400 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          plan.active ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {plan.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="mt-1 text-2xl font-bold text-white">${plan.price}<span className="text-sm font-normal text-gray-400">/mo</span></p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleActive(plan)}
                        disabled={actingId === plan.id}
                        className="rounded-lg bg-white/5 p-2 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
                        title={plan.active ? 'Deactivate' : 'Activate'}
                      >
                        {plan.active ? <ToggleRight className="h-4 w-4 text-green-400" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => startEdit(plan)}
                        className="rounded-lg bg-white/5 p-2 text-gray-400 hover:bg-white/10 hover:text-blue-400"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        disabled={actingId === plan.id}
                        className="rounded-lg bg-white/5 p-2 text-gray-400 hover:bg-white/10 hover:text-red-400 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <MemoryStick className="h-4 w-4 text-blue-400" />
                      RAM: {formatStorage(plan.ram)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Cpu className="h-4 w-4 text-purple-400" />
                      CPU: {plan.cpu}%
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <HardDrive className="h-4 w-4 text-amber-400" />
                      Storage: {formatStorage(plan.storage)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Bot className="h-4 w-4 text-green-400" />
                      Max Bots: {plan.maxBots}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PlanForm: React.FC<{
  form: Omit<Plan, 'id'>;
  setForm: React.Dispatch<React.SetStateAction<Omit<Plan, 'id'>>>;
}> = ({ form, setForm }) => {
  const update = (fields: Partial<Omit<Plan, 'id'>>) =>
    setForm((prev) => ({ ...prev, ...fields }));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">Plan Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="e.g. Pro"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">Price ($/mo)</label>
        <input
          type="number"
          value={form.price}
          onChange={(e) => update({ price: Number(e.target.value) })}
          min="0"
          step="0.01"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">RAM (MB)</label>
        <input
          type="number"
          value={form.ram}
          onChange={(e) => update({ ram: Number(e.target.value) })}
          min="64"
          step="64"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">CPU (%)</label>
        <input
          type="number"
          value={form.cpu}
          onChange={(e) => update({ cpu: Number(e.target.value) })}
          min="10"
          max="400"
          step="10"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">Storage (MB)</label>
        <input
          type="number"
          value={form.storage}
          onChange={(e) => update({ storage: Number(e.target.value) })}
          min="256"
          step="256"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">Max Bots</label>
        <input
          type="number"
          value={form.maxBots}
          onChange={(e) => update({ maxBots: Number(e.target.value) })}
          min="1"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
};

export default AdminPlansPage;
