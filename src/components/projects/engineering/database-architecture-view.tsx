"use client";

import { useState } from "react";
import {
  Database,
  Key,
  Link as LinkIcon,
  Shield,
  FileCode2,
  GitBranch,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DatabaseArchitectureViewProps = {
  entities: any[];
  backendApis?: any[];
  onSelectEntity?: (entity: any) => void;
};

export function DatabaseArchitectureView({
  entities = [],
  backendApis = [],
  onSelectEntity,
}: DatabaseArchitectureViewProps) {
  const [selectedEntityId, setSelectedEntityId] = useState<string>(entities[0]?.id || "");
  const [activeTab, setActiveTab] = useState<"diagram" | "schema" | "prisma" | "migrations">("diagram");
  const [copied, setCopied] = useState(false);

  const selectedEntity = entities.find((e) => e.id === selectedEntityId) || entities[0];

  // Parse structured fields
  const getFields = (entity: any) => {
    try {
      if (typeof entity.fields === "string") return JSON.parse(entity.fields);
      if (Array.isArray(entity.fields)) return entity.fields;
    } catch {}
    return [];
  };

  // Parse relationships
  const getRelations = (entity: any) => {
    try {
      if (typeof entity.relationships === "string") return JSON.parse(entity.relationships);
      if (Array.isArray(entity.relationships)) return entity.relationships;
    } catch {}
    return [];
  };

  // Parse indexes
  const getIndexes = (entity: any) => {
    try {
      if (typeof entity.indexes === "string") return JSON.parse(entity.indexes);
      if (Array.isArray(entity.indexes)) return entity.indexes;
    } catch {}
    return [];
  };

  // Generate synthetic Prisma Schema representation
  const generatePrismaSchema = () => {
    return entities
      .map((e) => {
        const fields = getFields(e);
        const fieldLines = fields
          .map((f: any) => {
            const pkAttr = f.isPk ? " @id @default(cuid())" : "";
            const uniqueAttr = f.isUnique && !f.isPk ? " @unique" : "";
            const defaultAttr = f.default ? ` @default(${f.default})` : "";
            return `  ${f.name.padEnd(16)} ${f.type.padEnd(12)}${pkAttr}${uniqueAttr}${defaultAttr}`;
          })
          .join("\n");
        return `model ${e.name} {\n${fieldLines}\n  // Linked to Requirement: ${e.requirementId || "N/A"}\n  @@map("${e.tableName}")\n}`;
      })
      .join("\n\n");
  };

  const copyPrisma = () => {
    navigator.clipboard.writeText(generatePrismaSchema());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (entities.length === 0) {
    return (
      <div className="p-8 text-center bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl">
        <Database className="w-8 h-8 mx-auto text-[var(--bos-text-tertiary)] mb-2" />
        <p className="text-[14px] font-medium text-[var(--bos-text-primary)]">No Database Entities Planned</p>
        <p className="text-[12px] text-[var(--bos-text-secondary)] mt-1">
          Generate an engineering blueprint to inspect tables, relations, and Prisma schemas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Bar with Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-500" />
          <h3 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">Database Architecture</h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bos-border)] text-[var(--bos-text-secondary)]">
            {entities.length} Entities
          </span>
        </div>

        <div className="flex items-center gap-1 bg-[var(--bos-bg)] p-1 rounded-lg border border-[var(--bos-border)]">
          <button
            onClick={() => setActiveTab("diagram")}
            className={cn(
              "text-[12px] px-3 py-1 rounded-md font-medium transition-all cursor-pointer",
              activeTab === "diagram" ? "bg-[var(--bos-surface)] text-[var(--bos-text-primary)] shadow-xs" : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
            )}
          >
            ER Diagram
          </button>
          <button
            onClick={() => setActiveTab("schema")}
            className={cn(
              "text-[12px] px-3 py-1 rounded-md font-medium transition-all cursor-pointer",
              activeTab === "schema" ? "bg-[var(--bos-surface)] text-[var(--bos-text-primary)] shadow-xs" : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
            )}
          >
            Entity Detail
          </button>
          <button
            onClick={() => setActiveTab("prisma")}
            className={cn(
              "text-[12px] px-3 py-1 rounded-md font-medium transition-all cursor-pointer",
              activeTab === "prisma" ? "bg-[var(--bos-surface)] text-[var(--bos-text-primary)] shadow-xs" : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
            )}
          >
            Prisma Schema
          </button>
        </div>
      </div>

      {/* Tab 1: ER Diagram / Entity Cards Grid */}
      {activeTab === "diagram" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map((entity) => {
            const fields = getFields(entity);
            const relations = getRelations(entity);
            const isSelected = selectedEntity?.id === entity.id;

            return (
              <div
                key={entity.id}
                onClick={() => {
                  setSelectedEntityId(entity.id);
                  onSelectEntity?.(entity);
                }}
                className={cn(
                  "p-4 rounded-xl border bg-[var(--bos-bg)] transition-all cursor-pointer flex flex-col justify-between group",
                  isSelected
                    ? "border-purple-500 ring-2 ring-purple-500/20 shadow-md"
                    : "border-[var(--bos-border)] hover:border-[var(--bos-border-strong)] shadow-xs",
                )}
              >
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-[var(--bos-border)]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-600">
                        <Database className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-mono font-semibold text-[var(--bos-text-primary)]">
                          {entity.name}
                        </h4>
                        <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">{entity.tableName}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bos-surface)] text-[var(--bos-text-secondary)]">
                      {entity.requirementId || "REQ"}
                    </span>
                  </div>

                  <p className="text-[11px] text-[var(--bos-text-secondary)] mt-2.5 line-clamp-2">
                    {entity.purpose}
                  </p>

                  {/* Columns List Preview */}
                  <div className="mt-3 space-y-1">
                    {fields.slice(0, 5).map((f: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] font-mono py-0.5">
                        <span className="flex items-center gap-1 text-[var(--bos-text-primary)]">
                          {f.isPk && <Key className="w-2.5 h-2.5 text-amber-500" />}
                          {f.isFk && <LinkIcon className="w-2.5 h-2.5 text-sky-500" />}
                          {f.name}
                        </span>
                        <span className="text-[10px] text-[var(--bos-text-tertiary)]">{f.type}</span>
                      </div>
                    ))}
                    {fields.length > 5 && (
                      <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block pt-1">
                        + {fields.length - 5} more columns
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-[var(--bos-border)] flex items-center justify-between text-[11px] text-[var(--bos-text-tertiary)]">
                  <span>{relations.length} Relations</span>
                  <span className="font-mono text-[10px] text-purple-600 font-medium">Click to inspect</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Entity Detailed Spec & Provenance */}
      {activeTab === "schema" && selectedEntity && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--bos-border)]">
              <div>
                <h4 className="text-[16px] font-mono font-bold text-[var(--bos-text-primary)]">{selectedEntity.name}</h4>
                <p className="text-[12px] font-mono text-[var(--bos-text-secondary)]">Table: {selectedEntity.tableName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600">
                  {selectedEntity.requirementId}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                  {selectedEntity.status}
                </span>
              </div>
            </div>

            {/* Field Schema Table */}
            <div>
              <h5 className="text-[12px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] mb-2 font-semibold">
                Fields & Attributes
              </h5>
              <div className="border border-[var(--bos-border)] rounded-lg overflow-hidden">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-[var(--bos-surface)] border-b border-[var(--bos-border)] font-mono text-[11px] text-[var(--bos-text-secondary)]">
                    <tr>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Attributes</th>
                      <th className="p-2.5">Default</th>
                      <th className="p-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--bos-border)] font-mono text-[11px]">
                    {getFields(selectedEntity).map((f: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[var(--bos-surface)]/50">
                        <td className="p-2.5 font-semibold text-[var(--bos-text-primary)] flex items-center gap-1.5">
                          {f.isPk && <span title="Primary Key"><Key className="w-3 h-3 text-amber-500" /></span>}
                          {f.isFk && <span title="Foreign Key"><LinkIcon className="w-3 h-3 text-sky-500" /></span>}
                          {f.name}
                        </td>
                        <td className="p-2.5 text-purple-600 dark:text-purple-400">{f.type}</td>
                        <td className="p-2.5 text-[var(--bos-text-secondary)]">
                          {f.isPk ? "PK" : f.isFk ? `FK -> ${f.fkTarget || "Parent"}` : f.isUnique ? "UNIQUE" : f.isNullable ? "NULL" : "NOT NULL"}
                        </td>
                        <td className="p-2.5 text-[var(--bos-text-tertiary)]">{f.default || "-"}</td>
                        <td className="p-2.5 text-[var(--bos-text-secondary)] font-sans">{f.description || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Indexes & Constraints */}
            <div>
              <h5 className="text-[12px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] mb-2 font-semibold">
                Indexes & Constraints
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {getIndexes(selectedEntity).map((idxName: string, idx: number) => (
                  <div key={idx} className="p-2 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-md font-mono text-[11px] text-[var(--bos-text-secondary)] flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
                    INDEX: {idxName}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Provenance & API Dependents */}
          <div className="space-y-4">
            <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl p-4 space-y-3">
              <h5 className="text-[12px] font-mono uppercase tracking-wider font-semibold text-[var(--bos-text-secondary)]">
                Why does this entity exist?
              </h5>
              <p className="text-[12px] text-[var(--bos-text-primary)]">
                {selectedEntity.purpose}
              </p>
              <div className="pt-2 border-t border-[var(--bos-border)] text-[11px] text-[var(--bos-text-secondary)]">
                <span className="font-semibold text-[var(--bos-text-primary)]">Source Requirement: </span>
                {selectedEntity.requirementId}
              </div>
              <div className="text-[11px] text-[var(--bos-text-secondary)]">
                <span className="font-semibold text-[var(--bos-text-primary)]">Migration Impact: </span>
                {selectedEntity.migrationImpact || "Low risk"}
              </div>
            </div>

            {/* Consuming APIs */}
            <div className="bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl p-4 space-y-3">
              <h5 className="text-[12px] font-mono uppercase tracking-wider font-semibold text-[var(--bos-text-secondary)]">
                Consuming APIs
              </h5>
              <div className="space-y-1.5">
                {backendApis
                  .filter((a) => a.requirementId === selectedEntity.requirementId || (a.databaseDependencies && a.databaseDependencies.includes(selectedEntity.name)))
                  .map((api) => (
                    <div key={api.id} className="p-2 bg-[var(--bos-surface)] rounded border border-[var(--bos-border)] flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-emerald-600">{api.method}</span>
                      <span className="text-[var(--bos-text-primary)]">{api.path}</span>
                    </div>
                  ))}
                {backendApis.length === 0 && (
                  <p className="text-[11px] text-[var(--bos-text-tertiary)] italic">No direct consuming APIs found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Prisma Schema Viewer */}
      {activeTab === "prisma" && (
        <div className="bg-[#121110] text-[#e0deda] border border-[#2a2825] rounded-xl p-4 shadow-md font-mono text-[12px] relative">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2a2825]">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-white">schema.prisma</span>
              <span className="text-[10px] text-[#8a857e]">Generated from Approved Blueprint</span>
            </div>
            <button
              onClick={copyPrisma}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#201d1a] hover:bg-[#2e2a25] text-white text-[11px] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy Schema"}
            </button>
          </div>
          <pre className="overflow-x-auto p-2 text-[11px] leading-relaxed text-purple-200">
            {generatePrismaSchema()}
          </pre>
        </div>
      )}
    </div>
  );
}
