import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Check } from 'lucide-react';
import { DirectoryBrowserModal } from './DirectoryBrowserModal';

interface AddServerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddServerModal({ isOpen, onClose, onSuccess }: AddServerModalProps) {
    const [loading, setLoading] = useState(false);
    const [browserOpenIdx, setBrowserOpenIdx] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        ip: '',
        user: '',
        port: 22,
        sshKeyPath: '',
        password: '',
        localBackupPath: '',
        backupPaths: [] as string[],
        dbUser: '',
        dbPassword: '',
        dbHost: 'localhost',
        dbPort: 3306,
        dbSelected: [] as string[],
        backupWww: true,
        backupLogs: true,
        backupNginx: true,
        backupDb: true,
    });
    const [availableDatabases, setAvailableDatabases] = useState<string[]>([]);
    const [enableSchedule, setEnableSchedule] = useState(false);
    const [scheduleType, setScheduleType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
    const [scheduleTime, setScheduleTime] = useState('02:00');
    const [scheduleDay, setScheduleDay] = useState<number | undefined>(undefined);
    const [customCron, setCustomCron] = useState('');
    const [scheduleName, setScheduleName] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Reset schedule name when form data changes
            if (formData.name) {
                setScheduleName(`${formData.name} - Scheduled Backup`);
            }
        }
    }, [formData.name, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        // Validate schedule fields if enabled
        if (enableSchedule) {
            if (!scheduleName.trim()) {
                setError('Schedule name is required when scheduling is enabled');
                setLoading(false);
                return;
            }
            if (scheduleType === 'custom' && !customCron.trim()) {
                setError('Custom cron expression is required');
                setLoading(false);
                return;
            }
        }
        
        try {
            const res = await fetch('/api/servers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: `Failed to add server: ${res.status} ${res.statusText}` }));
                throw new Error(errorData.error || `Failed to add server: ${res.status}`);
            }
            
            const newServer = await res.json();
            
            // Create cron job if schedule is enabled
            let scheduleError = null;
            if (enableSchedule && scheduleName.trim()) {
                try {
                    const cronPayload: any = {
                        name: scheduleName.trim(),
                        serverId: newServer.id,
                        scheduleType,
                        enabled: true,
                    };

                    if (scheduleType === 'custom') {
                        if (!customCron.trim()) {
                            scheduleError = 'Custom cron expression is required';
                        } else {
                            cronPayload.schedule = customCron.trim();
                        }
                    } else {
                        cronPayload.scheduleTime = scheduleTime;
                        if (scheduleType === 'weekly' || scheduleType === 'monthly') {
                            cronPayload.scheduleDay = scheduleDay;
                        }
                    }

                    if (!scheduleError) {
                        console.log('Creating cron job with payload:', cronPayload);
                        const cronRes = await fetch('/api/cron-jobs', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(cronPayload),
                        });

                        const cronResponseData = await cronRes.json().catch(() => ({}));
                        console.log('Cron job creation response:', cronRes.status, cronResponseData);

                        if (!cronRes.ok) {
                            scheduleError = `Server added successfully, but schedule creation failed: ${cronResponseData.error || cronResponseData.details || 'Unknown error'}`;
                        } else {
                            console.log('Schedule created successfully:', cronResponseData);
                            // Verify the schedule was actually created
                            if (!cronResponseData.id) {
                                scheduleError = 'Schedule creation response was invalid - schedule may not have been saved';
                            }
                        }
                    }
                } catch (scheduleErr: any) {
                    console.error('Error creating schedule:', scheduleErr);
                    scheduleError = `Server added successfully, but schedule creation failed: ${scheduleErr.message || 'Unknown error'}`;
                }
            }
            
            if (scheduleError) {
                setError(scheduleError);
            } else {
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            console.error('Error adding server:', error);
            setError(error.message || 'Failed to add server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-10">
            <div className="bg-card border border-border rounded-lg w-full max-w-2xl p-6 shadow-lg animate-in fade-in zoom-in duration-200 my-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Add Server</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4 border border-border rounded-lg p-4">
                        <h3 className="font-semibold text-lg">Basic Information</h3>
                        <p className="text-sm text-muted-foreground -mt-3 mb-4">Enter the basic details of your server</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Server Name</label>
                                <input
                                    required
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Production Server"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Hostname/IP</label>
                                <input
                                    required
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.ip}
                                    onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                                    placeholder="e.g., 192.168.1.100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">SSH Port</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.port}
                                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">SSH Username</label>
                                <input
                                    required
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.user}
                                    onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                                    placeholder="e.g., root"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SSH Configuration */}
                    <div className="space-y-4 border border-border rounded-lg p-4">
                        <h3 className="font-semibold text-lg">SSH Configuration</h3>
                        <p className="text-sm text-muted-foreground -mt-3 mb-4">Provide SSH key path or password for authentication</p>

                        <div>
                            <label className="block text-sm font-medium mb-1">SSH Private Key Path</label>
                            <input
                                required={!formData.password} // Adjusted required logic
                                className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                value={formData.sshKeyPath}
                                onChange={(e) => setFormData({ ...formData, sshKeyPath: e.target.value })}
                                placeholder="e.g., ~/.ssh/id_rsa"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Password (optional, for password auth)</label>
                            <input
                                type="password"
                                required={!formData.sshKeyPath} // Adjusted required logic
                                className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="SSH password"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Local Backup Path (Optional)</label>
                            <input
                                className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                value={formData.localBackupPath}
                                onChange={(e) => setFormData({ ...formData, localBackupPath: e.target.value })}
                                placeholder="Leave empty to use global backup location"
                            />
                            <p className="text-xs text-muted-foreground mt-1">If empty, backups will use the Global Backup Output Location from Settings</p>
                        </div>
                    </div>

                    {/* Backup Options */}
                    <div className="space-y-4 border border-border rounded-lg p-4">
                        <h3 className="font-semibold text-lg">Backup Options</h3>
                        <p className="text-sm text-muted-foreground -mt-3 mb-4">Select what to include in backups</p>

                        <div className="space-y-2">
                            {[
                                { key: 'backupWww', label: 'Backup /var/www (Web Files)' },
                                { key: 'backupLogs', label: 'Backup /var/log (Logs)' },
                                { key: 'backupNginx', label: 'Backup /etc/nginx (Nginx Config)' },
                                { key: 'backupDb', label: 'Backup Database (mysqldump)' },
                            ].map((option) => (
                                <label key={option.key} className="flex items-center gap-2 cursor-pointer">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData[option.key as keyof typeof formData] ? 'bg-primary border-primary' : 'border-input bg-background'} `}>
                                        {formData[option.key as keyof typeof formData] && <Check className="w-3 h-3 text-primary-foreground" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={formData[option.key as keyof typeof formData] as boolean}
                                        onChange={(e) => setFormData({ ...formData, [option.key]: e.target.checked })}
                                    />
                                    <span className="text-sm">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* MySQL Databases */}
                    <div className="space-y-4 border border-border rounded-lg p-4">
                        <h3 className="font-semibold text-lg">MySQL Databases</h3>
                        <p className="text-sm text-muted-foreground -mt-3 mb-4">Provide credentials to detect databases and select which to dump</p>
                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">DB Host</label>
                                <input className="w-full h-10 px-3 rounded-md border border-input bg-background" value={formData.dbHost} onChange={(e) => setFormData({ ...formData, dbHost: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">DB Port</label>
                                <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background" value={formData.dbPort} onChange={(e) => setFormData({ ...formData, dbPort: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">DB User</label>
                                <input className="w-full h-10 px-3 rounded-md border border-input bg-background" value={formData.dbUser} onChange={(e) => setFormData({ ...formData, dbUser: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">DB Password</label>
                                <input type="password" className="w-full h-10 px-3 rounded-md border border-input bg-background" value={formData.dbPassword} onChange={(e) => setFormData({ ...formData, dbPassword: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={async () => {
                                try {
                                    const res = await fetch('/api/dbs', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            host: formData.ip,
                                            port: formData.port,
                                            user: formData.user,
                                            sshKeyPath: formData.sshKeyPath || undefined,
                                            password: formData.password || undefined,
                                            dbHost: formData.dbHost,
                                            dbUser: formData.dbUser,
                                            dbPassword: formData.dbPassword,
                                            dbPort: formData.dbPort,
                                        }),
                                    });
                                    const data = await res.json();
                                    if (!res.ok) {
                                        alert(`Detect failed: ${data?.error || 'Unknown error'}`);
                                        return;
                                    }
                                    if (Array.isArray(data.databases)) {
                                        setAvailableDatabases(data.databases);
                                        setFormData({ ...formData, dbSelected: data.databases });
                                    }
                                } catch (e) {
                                    alert('Detect failed');
                                }
                            }}>Detect</Button>
                        </div>
                        <div className="space-y-2">
                            <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded p-2">
                                {(availableDatabases.length > 0 ? availableDatabases : formData.dbSelected).map((db) => (
                                    <label key={db} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.dbSelected.includes(db)}
                                            onChange={(e) => {
                                                const current = new Set(formData.dbSelected);
                                                if (e.target.checked) {
                                                    current.add(db);
                                                } else {
                                                    current.delete(db);
                                                }
                                                setFormData({ ...formData, dbSelected: Array.from(current) });
                                            }}
                                        />
                                        <span className="text-sm">{db}</span>
                                    </label>
                                ))}
                                {availableDatabases.length === 0 && formData.dbSelected.length === 0 && (
                                    <div className="text-sm text-muted-foreground italic">No databases detected or selected</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Custom Backup Locations */}
                    <div className="space-y-4 border border-border rounded-lg p-4">
                        <h3 className="font-semibold text-lg">Custom Backup Locations</h3>
                        <p className="text-sm text-muted-foreground -mt-3 mb-4">Add absolute paths on the remote server to include in backups</p>
                        <div className="space-y-2">
                            {formData.backupPaths.map((p, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        className="flex-1 h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                        value={p}
                                        onChange={(e) => {
                                            const arr = [...formData.backupPaths];
                                            arr[idx] = e.target.value;
                                            setFormData({ ...formData, backupPaths: arr });
                                        }}
                                        placeholder="e.g., /opt/data/uploads"
                                    />
                                    <Button type="button" variant="outline" onClick={() => {
                                        const arr = formData.backupPaths.filter((_, i) => i !== idx);
                                        setFormData({ ...formData, backupPaths: arr });
                                    }}>Remove</Button>
                                    <Button type="button" onClick={() => setBrowserOpenIdx(idx)}>Browse</Button>
                                </div>
                            ))}
                            <Button type="button" variant="secondary" onClick={() => setFormData({ ...formData, backupPaths: [...formData.backupPaths, ''] })}>Add Location</Button>
                        </div>
                    </div>

                    <DirectoryBrowserModal
                        isOpen={browserOpenIdx !== null}
                        onClose={() => setBrowserOpenIdx(null)}
                        onSelect={(selected) => {
                            if (browserOpenIdx === null) return;
                            const arr = [...formData.backupPaths];
                            arr[browserOpenIdx] = selected;
                            setFormData({ ...formData, backupPaths: arr });
                            setBrowserOpenIdx(null);
                        }}
                        initialPath={formData.backupPaths[browserOpenIdx ?? 0] || '/'}
                        connection={{
                            host: formData.ip,
                            port: formData.port,
                            user: formData.user,
                            sshKeyPath: formData.sshKeyPath || undefined,
                            password: formData.password || undefined,
                        }}
                    />

                    {/* Schedule Backup */}
                    <div className="space-y-4 border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h3 className="font-semibold text-lg">Schedule Backup</h3>
                                <p className="text-sm text-muted-foreground -mt-1">Optionally create an automated backup schedule for this server</p>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={enableSchedule}
                                    onChange={(e) => setEnableSchedule(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-medium">Enable Schedule</span>
                            </label>
                        </div>

                        {enableSchedule && (
                            <div className="space-y-4 pt-2">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Schedule Name</label>
                                    <input
                                        type="text"
                                        required={enableSchedule}
                                        value={scheduleName}
                                        onChange={(e) => setScheduleName(e.target.value)}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                        placeholder="e.g., Daily Backup at 2 AM"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Schedule Type</label>
                                    <select
                                        value={scheduleType}
                                        onChange={(e) => setScheduleType(e.target.value as any)}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="custom">Custom Cron Expression</option>
                                    </select>
                                </div>

                                {scheduleType === 'custom' ? (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Cron Expression</label>
                                        <input
                                            type="text"
                                            required={enableSchedule && scheduleType === 'custom'}
                                            value={customCron}
                                            onChange={(e) => setCustomCron(e.target.value)}
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                                            placeholder="0 2 * * * (minute hour day month dayOfWeek)"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Format: minute hour day month dayOfWeek (e.g., "0 2 * * *" for daily at 2 AM)
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Time</label>
                                            <input
                                                type="time"
                                                required={enableSchedule}
                                                value={scheduleTime}
                                                onChange={(e) => setScheduleTime(e.target.value)}
                                                className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                            />
                                        </div>

                                        {scheduleType === 'weekly' && (
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Day of Week</label>
                                                <select
                                                    value={scheduleDay || 0}
                                                    onChange={(e) => setScheduleDay(parseInt(e.target.value))}
                                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
                                                <label className="block text-sm font-medium mb-1">Day of Month</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="31"
                                                    required={enableSchedule && scheduleType === 'monthly'}
                                                    value={scheduleDay || 1}
                                                    onChange={(e) => setScheduleDay(parseInt(e.target.value))}
                                                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Server'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
