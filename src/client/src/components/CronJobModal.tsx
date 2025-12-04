import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Save, Clock } from 'lucide-react';

interface CronJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    job?: any;
    servers: any[];
}

export function CronJobModal({ isOpen, onClose, onSuccess, job, servers }: CronJobModalProps) {
    const [name, setName] = useState('');
    const [serverId, setServerId] = useState<number | null>(null);
    const [scheduleType, setScheduleType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
    const [scheduleTime, setScheduleTime] = useState('02:00');
    const [scheduleDay, setScheduleDay] = useState<number | undefined>(undefined);
    const [customCron, setCustomCron] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (job) {
                setName(job.name || '');
                setServerId(job.serverId || null);
                setScheduleType(job.scheduleType || 'daily');
                setScheduleTime(job.scheduleTime || '02:00');
                setScheduleDay(job.scheduleDay || undefined);
                setCustomCron(job.scheduleType === 'custom' ? job.schedule : '');
                setEnabled(job.enabled !== false);
            } else {
                setName('');
                setServerId(null);
                setScheduleType('daily');
                setScheduleTime('02:00');
                setScheduleDay(undefined);
                setCustomCron('');
                setEnabled(true);
            }
            setError('');
        }
    }, [isOpen, job]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const payload: any = {
                name,
                serverId: serverId || null,
                scheduleType,
                enabled,
            };

            if (scheduleType === 'custom') {
                payload.schedule = customCron;
            } else {
                payload.scheduleTime = scheduleTime;
                if (scheduleType === 'weekly' || scheduleType === 'monthly') {
                    payload.scheduleDay = scheduleDay;
                }
            }

            const url = job ? `/api/cron-jobs/${job.id}` : '/api/cron-jobs';
            const method = job ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || data.details || 'Failed to save cron job');
            }

            onSuccess();
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to save cron job');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        {job ? 'Edit Schedule' : 'Create Schedule'}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-destructive/10 text-destructive p-3 rounded border border-destructive/20">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-2">Job Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                            placeholder="e.g., Daily Backup at 2 AM"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Server</label>
                        <select
                            value={serverId || ''}
                            onChange={(e) => setServerId(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                        >
                            <option value="">All Servers</option>
                            {servers.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.ip})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Schedule Type</label>
                        <select
                            value={scheduleType}
                            onChange={(e) => setScheduleType(e.target.value as any)}
                            className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="custom">Custom Cron Expression</option>
                        </select>
                    </div>

                    {scheduleType === 'custom' ? (
                        <div>
                            <label className="block text-sm font-medium mb-2">Cron Expression</label>
                            <input
                                type="text"
                                required
                                value={customCron}
                                onChange={(e) => setCustomCron(e.target.value)}
                                className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background font-mono"
                                placeholder="0 2 * * * (minute hour day month dayOfWeek)"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Format: minute hour day month dayOfWeek (e.g., "0 2 * * *" for daily at 2 AM)
                            </p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-2">Time</label>
                                <input
                                    type="time"
                                    required
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                    className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                />
                            </div>

                            {scheduleType === 'weekly' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Day of Week</label>
                                    <select
                                        value={scheduleDay || 0}
                                        onChange={(e) => setScheduleDay(parseInt(e.target.value))}
                                        className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                    >
                                        <option value={0}>Sunday</option>
                                        <option value={1}>Monday</option>
                                        <option value={2}>Tuesday</option>
                                        <option value={3}>Wednesday</option>
                                        <option value={4}>Thursday</option>
                                        <option value={5}>Friday</option>
                                        <option value={6}>Saturday</option>
                                    </select>
                                </div>
                            )}

                            {scheduleType === 'monthly' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Day of Month</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        required
                                        value={scheduleDay || 1}
                                        onChange={(e) => setScheduleDay(parseInt(e.target.value))}
                                        className="w-full h-10 px-3 rounded-[var(--radius)] border border-input bg-background"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="enabled"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <label htmlFor="enabled" className="text-sm font-medium">
                            Enable this schedule
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving} className="gap-2">
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Schedule'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

