const fs = require('fs');

let content = fs.readFileSync('src/components/employee/portal/employee-os-container.tsx', 'utf8');

const target = '</header>';

if (!content.includes('MY PROJECT:') && content.includes(target)) {
  const contextStrip = `</header>

      {/* Section 7 & 18: Project Execution Context Strip (Zero Data Leakage) */}
      <div className="bg-[var(--bos-surface-panel)] border-b border-[var(--bos-border)] px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-4 font-mono text-xs z-30 shadow-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">MY PROJECT:</span>
            {portalData?.projectSwitcher?.length > 1 ? (
              <select
                value={selectedProjectId || portalData?.currentProject?.id || ""}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-lg px-2.5 py-1 text-xs font-bold text-blue-400 outline-none cursor-pointer"
              >
                {portalData.projectSwitcher.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            ) : (
              <strong className="text-blue-400 font-bold">{portalData?.myProject?.name || portalData?.currentProject?.name || "Active Workspace"}</strong>
            )}
          </div>

          <div className="flex items-center gap-1.5 border-l border-[var(--bos-border)] pl-3">
            <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">MY ROLE:</span>
            <strong className="text-emerald-400 font-bold">{portalData?.myRole || portalData?.employee?.role}</strong>
          </div>

          <div className="flex items-center gap-1.5 border-l border-[var(--bos-border)] pl-3">
            <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">MY TEAM:</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-bold text-[11px] border border-blue-500/20">
              {portalData?.myTeam || "FRONTEND"}
            </span>
          </div>
        </div>

        {/* MY WORK Metrics */}
        <div className="flex items-center gap-2 text-[11px] text-[var(--bos-text-secondary)] flex-wrap">
          <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">MY WORK:</span>
          <span className="font-bold text-white">{portalData?.myWork?.assigned || 0} assigned</span>
          <span>·</span>
          <span className="text-emerald-400 font-bold">{portalData?.myWork?.completed || 0} completed</span>
          <span>·</span>
          <span className="text-blue-400 font-bold">{portalData?.myWork?.inProgress || 0} in progress</span>
          <span>·</span>
          <span className="text-amber-400 font-bold">{portalData?.myWork?.waiting || 0} waiting</span>
          <span>·</span>
          <span className="text-purple-400 font-bold">{portalData?.myWork?.review || 0} review</span>
        </div>

        {/* TEAMS Count Strip */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] border-l border-[var(--bos-border)] pl-4">
          <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">TEAM:</span>
          <span className="text-slate-300">Frontend <strong className="text-white">{portalData?.projectTeams?.frontend || 0}</strong></span>
          <span className="text-slate-300">Backend <strong className="text-white">{portalData?.projectTeams?.backend || 0}</strong></span>
          <span className="text-slate-300">Database <strong className="text-white">{portalData?.projectTeams?.database || 0}</strong></span>
          <span className="text-slate-300">QA <strong className="text-white">{portalData?.projectTeams?.qa || 0}</strong></span>
        </div>
      </div>`;

  content = content.replace(target, contextStrip);
  fs.writeFileSync('src/components/employee/portal/employee-os-container.tsx', content, 'utf8');
  console.log('Context strip added to employee-os-container.tsx successfully!');
} else {
  console.log('Already patched or target not found');
}
