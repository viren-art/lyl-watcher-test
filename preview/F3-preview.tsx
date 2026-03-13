export default function AuthPreview() {
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('GRID_ANALYST');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState([
    'A3K9P2M7', 'B8L4Q6N1', 'C2R7T5W9', 'D6Y3H8J4',
    'E1M9K7P2', 'F5N3L8Q6', 'G9W2R4T7', 'H4J6Y8M1',
    'J7P5K3N9', 'K2L8Q4W6'
  ]);
  const [usedBackupCodes, setUsedBackupCodes] = useState([]);
  const [showBackupCodeWarning, setShowBackupCodeWarning] = useState(false);

  const mockRegions = [
    { id: 1, name: 'Northeast', subscribed: true },
    { id: 2, name: 'Midwest', subscribed: true },
    { id: 3, name: 'Western', subscribed: false },
    { id: 4, name: 'Southern', subscribed: true },
    { id: 5, name: 'Pacific', subscribed: false }
  ];

  const mockAuditLogs = [
    { id: 1, event: 'login', user: 'สมชาย วงศ์ไทย', time: '2024-01-15 14:23:45', success: true, ip: '203.154.12.45' },
    { id: 2, event: 'backup_code_used', user: 'สมชาย วงศ์ไทย', time: '2024-01-15 14:20:12', success: true, ip: '203.154.12.45' },
    { id: 3, event: 'access_denied', user: 'สุภาพ ใจดี', time: '2024-01-15 14:18:12', success: false, ip: '203.154.12.46' },
    { id: 4, event: 'mfa_setup', user: 'ประยุทธ์ สุขใจ', time: '2024-01-15 13:45:22', success: true, ip: '203.154.12.47' },
    { id: 5, event: 'backup_codes_regenerated', user: 'วิไล ศรีสุข', time: '2024-01-15 13:30:08', success: true, ip: '203.154.12.48' },
    { id: 6, event: 'login_failed', user: 'นิรันดร์ มั่นคง', time: '2024-01-15 12:55:33', success: false, ip: '203.154.12.49' }
  ];

  const rolePermissions = {
    ADMIN: ['weather:read', 'weather:write', 'grid:read', 'grid:write', 'bess:read', 'bess:write', 'users:write'],
    GRID_ANALYST: ['weather:read', 'grid:read', 'grid:write', 'bess:read'],
    BESS_PLANNER: ['weather:read', 'grid:read', 'bess:read', 'bess:write'],
    VIEWER: ['weather:read', 'grid:read', 'bess:read']
  };

  const handleLogin = () => {
    if (email && password) {
      setShowMfaSetup(true);
    }
  };

  const handleMfaVerify = () => {
    if (mfaCode.length === 6 || mfaCode.length === 8) {
      // Check if it's a backup code
      if (mfaCode.length === 8 && backupCodes.includes(mfaCode)) {
        setUsedBackupCodes([...usedBackupCodes, mfaCode]);
        const remaining = backupCodes.filter(c => !usedBackupCodes.includes(c) && c !== mfaCode).length;
        if (remaining <= 2) {
          setShowBackupCodeWarning(true);
          setTimeout(() => setShowBackupCodeWarning(false), 5000);
        }
      }
      setIsAuthenticated(true);
      setView('dashboard');
      setShowMfaSetup(false);
      setMfaCode('');
    }
  };

  const handleRegionAccess = (region) => {
    if (!region.subscribed) {
      setShowAccessDenied(true);
      setSelectedRegion(region);
      setTimeout(() => setShowAccessDenied(false), 3000);
    } else {
      setSelectedRegion(region);
    }
  };

  const handleRegenerateBackupCodes = () => {
    const newCodes = [
      'X9M2K7P4', 'Y3L8Q5N6', 'Z7R4T2W1', 'A8Y6H3J9',
      'B2M4K9P7', 'C6N8L3Q5', 'D1W7R9T4', 'E5J3Y2M8',
      'F9P7K4N2', 'G3L5Q8W1'
    ];
    setBackupCodes(newCodes);
    setUsedBackupCodes([]);
    setShowBackupCodes(true);
  };

  const hasPermission = (permission) => {
    return rolePermissions[userRole]?.includes(permission) || false;
  };

  const remainingBackupCodes = backupCodes.filter(c => !usedBackupCodes.includes(c)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950">
      {/* Header */}
      <div className="sticky top-0 backdrop-blur-xl bg-zinc-900/80 border-b border-white/5 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Grid AI Platform</h1>
              <p className="text-xs text-zinc-400">B2B Authentication & Access Control</p>
            </div>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">สมชาย วงศ์ไทย</p>
                <p className="text-xs text-zinc-400">{userRole}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <span className="text-sm">👤</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Access Denied Toast */}
      {showAccessDenied && (
        <div className="fixed top-20 right-6 z-50 animate-slide-in">
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 shadow-lg shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-rose-400">Access Denied</p>
                <p className="text-xs text-zinc-400">Region not subscribed: {selectedRegion?.name}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup Code Warning Toast */}
      {showBackupCodeWarning && (
        <div className="fixed top-20 right-6 z-50 animate-slide-in">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 shadow-lg shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-400">Low Backup Codes</p>
                <p className="text-xs text-zinc-400">Only {remainingBackupCodes} backup codes remaining. Regenerate soon.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Modal */}
      {showBackupCodes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-800 rounded-2xl p-8 max-w-2xl w-full border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔑</span>
                <div>
                  <h3 className="text-xl font-bold text-white">Backup Recovery Codes</h3>
                  <p className="text-sm text-zinc-400">Save these codes securely. Each can be used once.</p>
                </div>
              </div>
              <button
                onClick={() => setShowBackupCodes(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-2 gap-3">
                {backupCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 rounded-lg px-4 py-3 border border-white/10 font-mono text-center"
                  >
                    <span className="text-violet-400 text-lg">{code}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-400 mb-1">Important Security Notice</p>
                  <ul className="text-xs text-zinc-400 space-y-1">
                    <li>• Store these codes in a secure password manager</li>
                    <li>• Each code can only be used once</li>
                    <li>• Use backup codes if you lose access to your authenticator app</li>
                    <li>• Regenerate codes if you suspect they've been compromised</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(backupCodes.join('\n'));
                }}
                className="flex-1 rounded-xl bg-white/5 border border-white/10 py-3 px-4 font-semibold text-white hover:bg-white/10 transition-all"
              >
                📋 Copy to Clipboard
              </button>
              <button
                onClick={() => setShowBackupCodes(false)}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 px-4 font-semibold text-white hover:from-violet-600 hover:to-purple-700 transition-all"
              >
                I've Saved These Codes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto mt-20">
            {/* Login Form */}
            {!showMfaSetup ? (
              <div className="bg-zinc-800/50 rounded-2xl p-8 border border-white/[0.06] shadow-lg shadow-black/20">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Sign In</h2>
                  <p className="text-sm text-zinc-400">Enter your credentials to access the platform</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@company.com"
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                    />
                  </div>

                  <button
                    onClick={handleLogin}
                    className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 px-4 font-semibold text-white hover:from-violet-600 hover:to-purple-700 active:scale-[0.98] transition-all shadow-lg shadow-violet-500/20"
                  >
                    Sign In
                  </button>

                  <div className="text-center">
                    <a href="#" className="text-sm text-violet-400 hover:text-violet-300">Forgot password?</a>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5">
                  <p className="text-xs text-zinc-500 text-center">
                    🔒 Protected by OAuth 2.0 + Multi-Factor Authentication
                  </p>
                </div>
              </div>
            ) : (
              /* MFA Setup */
              <div className="bg-zinc-800/50 rounded-2xl p-8 border border-white/[0.06] shadow-lg shadow-black/20">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔐</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Setup MFA</h2>
                  <p className="text-sm text-zinc-400">Scan QR code with your authenticator app</p>
                </div>

                <div className="bg-white rounded-2xl p-6 mb-6">
                  <div className="w-48 h-48 mx-auto bg-zinc-100 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-2">📱</div>
                      <p className="text-xs text-zinc-600">QR Code</p>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 rounded-xl p-4 mb-6">
                  <p className="text-xs text-zinc-400 mb-2">Manual Entry Code:</p>
                  <p className="text-sm font-mono text-violet-400">JBSW Y3DP EHPK 3PXP</p>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">💾</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-400 mb-1">Backup Codes Generated</p>
                      <p className="text-xs text-zinc-400">10 backup codes have been generated. You'll see them after verification.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Verification Code (6 digits) or Backup Code (8 chars)
                  </label>
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                    placeholder="000000 or A3K9P2M7"
                    maxLength={8}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center text-2xl font-mono text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 tracking-widest"
                  />
                </div>

                <button
                  onClick={handleMfaVerify}
                  disabled={mfaCode.length !== 6 && mfaCode.length !== 8}
                  className="w-full mt-6 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 px-4 font-semibold text-white hover:from-violet-600 hover:to-purple-700 active:scale-[0.98] transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify & Continue
                </button>

                <button
                  onClick={() => setShowBackupCodes(true)}
                  className="w-full mt-3 rounded-xl bg-white/5 border border-white/10 py-3 px-4 font-semibold text-zinc-400 hover:bg-white/10 hover:text-white transition-all"
                >
                  View Backup Codes
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Dashboard */
          <div className="space-y-6">
            {/* MFA Status Card */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-2xl p-6 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🔐</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-300">MFA Enabled & Active</p>
                    <p className="text-xs text-zinc-400">
                      {remainingBackupCodes} of 10 backup codes remaining
                      {remainingBackupCodes <= 2 && <span className="text-amber-400 ml-2">⚠️ Low backup codes!</span>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRegenerateBackupCodes}
                  className="rounded-xl bg-violet-500/20 border border-violet-500/30 px-4 py-2 text-sm font-semibold text-violet-400 hover:bg-violet-500/30 transition-all"
                >
                  Regenerate Codes
                </button>
              </div>
            </div>

            {/* Role & Permissions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06] shadow-lg shadow-black/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Current Role</h3>
                  <span className="text-2xl">👤</span>
                </div>
                <div className="space-y-3">
                  {['ADMIN', 'GRID_ANALYST', 'BESS_PLANNER', 'VIEWER'].map((role) => (
                    <button
                      key={role}
                      onClick={() => setUserRole(role)}
                      className={`w-full rounded-xl px-4 py-3 text-left font-medium transition-all ${
                        userRole === role
                          ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300'
                          : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      {role.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06] shadow-lg shadow-black/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Permissions</h3>
                  <span className="text-2xl">🔑</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {['weather:read', 'weather:write', 'grid:read', 'grid:write', 'bess:read', 'bess:write', 'users:write'].map((perm) => (
                    <div
                      key={perm}
                      className={`rounded-xl px-4 py-3 border ${
                        hasPermission(perm)
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-zinc-900/50 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{hasPermission(perm) ? '✅' : '❌'}</span>
                        <span className={`text-sm font-medium ${hasPermission(perm) ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          {perm}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Regional Access */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06] shadow-lg shadow-black/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Regional Access</h3>
                <span className="text-2xl">🗺️</span>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {mockRegions.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => handleRegionAccess(region)}
                    className={`rounded-xl p-4 border transition-all ${
                      region.subscribed
                        ? 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20'
                        : 'bg-zinc-900/50 border-white/5 hover:bg-rose-500/10 hover:border-rose-500/30'
                    }`}
                  >
                    <div className="text-center">
                      <span className="text-2xl mb-2 block">{region.subscribed ? '📍' : '🔒'}</span>
                      <p className={`text-sm font-medium ${region.subscribed ? 'text-cyan-400' : 'text-zinc-500'}`}>
                        {region.name}
                      </p>
                      <p className="text-xs text-zinc-600 mt-1">
                        {region.subscribed ? 'Active' : 'Locked'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Security Audit Log */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06] shadow-lg shadow-black/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Security Audit Log</h3>
                <span className="text-2xl">📋</span>
              </div>
              <div className="space-y-2">
                {mockAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-zinc-900/50 rounded-xl p-4 border border-white/5 hover:bg-zinc-900/70 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {log.success ? '✅' : '⚠️'}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white">{log.event.replace('_', ' ').toUpperCase()}</p>
                          <p className="text-xs text-zinc-400">{log.user}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-400">{log.time}</p>
                        <p className="text-xs text-zinc-500">{log.ip}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Info */}
            <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-2xl p-6 border border-violet-500/20">
              <div className="flex items-center gap-4">
                <span className="text-3xl">🔐</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-violet-300">Active Session</p>
                  <p className="text-xs text-zinc-400">OAuth 2.0 + MFA Verified • Token expires in 58 minutes</p>
                </div>
                <button className="rounded-xl bg-rose-500/20 border border-rose-500/30 px-4 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-500/30 transition-all">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}