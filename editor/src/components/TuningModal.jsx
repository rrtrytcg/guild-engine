import { useState } from 'react'
import useStore from '../store/useStore'
import projectSchema from '../../../schema/project.schema.json'

const TAB_OPTIONS = [
  { id: 'formula', label: 'Formula Lab' },
  { id: 'xp', label: 'XP Curves' },
  { id: 'economy', label: 'Economy Sim' },
]

const DEFAULT_VARIABLE_IDS = ['worker_skill', 'building_level', 'batch_size', 'item_rarity_tier', 'streak_count', 'momentum']
const DEFAULT_DANGER_ZONES = [
  { variable: 'failure_chance', red_above: 0.3, yellow_above: 0.15, label: 'High failure rate' },
  { variable: 'crit_chance', red_above: 0.4, yellow_above: 0.25, label: 'Crit rate may trivialize content' },
  { variable: 'duration_ticks', red_below: 10, yellow_below: 30, label: 'Very short jobs may cause performance issues' },
  { variable: 'batch_size', red_above: 20, yellow_above: 10, label: 'Large batches may cause UI lag' },
]
const FORMULA_HELPERS = {
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  sqrt: Math.sqrt,
  clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
}
const FORMULA_IDENTIFIER_RE = /\b[A-Za-z_][A-Za-z0-9_]*\b/g
const SAFE_FORMULA_CHARS_RE = /^[0-9A-Za-z_+\-*/%().,?:<>=!&| \t\r\n]+$/
const BANNED_FORMULA_TOKENS_RE = /(?:__proto__|prototype|constructor|globalThis|window|document|Function|eval|import|new|this|;|\[|\]|\{|\}|`|'|"|\\)/i
const EXACT_FORMULA_VARIABLES = new Set([
  'item_level',
  'item_rarity_tier',
  'item_quality_tier',
  'building_level',
  'worker_skill',
  'worker_specialization_match',
  'worker_level',
  'batch_size',
  'momentum',
  'streak_count',
  'base_failure',
  'base_crit',
  'forge_level',
  'base_duration',
  'base_duration_ticks',
  'failure_chance',
  'crit_chance',
  'duration_ticks',
])
const DYNAMIC_FORMULA_VARIABLE_PATTERNS = [
  /^item_craft_cost_[A-Za-z0-9_]+$/,
  /^item_base_stat_[A-Za-z0-9_]+$/,
  /^resource_[A-Za-z0-9_]+$/,
]
const FORMULA_VARIABLE_DEFS = [
  { id: 'worker_skill', label: 'Worker skill', min: 0, max: 100, step: 1, defaultValue: 50, source: 'Assigned artisan primary stat value.' },
  { id: 'building_level', label: 'Building level', min: 1, max: 10, step: 1, defaultValue: 3, source: 'Building instance current level.' },
  { id: 'batch_size', label: 'Batch size', min: 1, max: 20, step: 1, defaultValue: 1, source: 'Current job batch count.' },
  { id: 'item_rarity_tier', label: 'Item rarity tier', min: 0, max: 4, step: 1, defaultValue: 1, source: '0=common through 4=legendary.' },
  { id: 'streak_count', label: 'Streak count', min: 0, max: 20, step: 1, defaultValue: 0, source: 'Consecutive same-recipe jobs.' },
  { id: 'momentum', label: 'Momentum', min: 0, max: 100, step: 1, defaultValue: 0, source: 'Current library-style momentum.' },
  { id: 'item_level', label: 'Item level', min: 1, max: 100, step: 1, defaultValue: 10, source: 'Source item instance level.' },
  { id: 'item_quality_tier', label: 'Item quality tier', min: 0, max: 3, step: 1, defaultValue: 0, source: 'Consumable quality tier.' },
  { id: 'worker_specialization_match', label: 'Specialization match', min: 0, max: 1, step: 1, defaultValue: 0, source: '1 if artisan specialization matches action type.' },
  { id: 'worker_level', label: 'Worker level', min: 1, max: 20, step: 1, defaultValue: 1, source: 'Assigned artisan hero level.' },
  { id: 'base_failure', label: 'Base failure', min: 0, max: 1, step: 0.01, defaultValue: 0.1, source: 'Workflow success_table.base_failure.' },
  { id: 'base_crit', label: 'Base crit', min: 0, max: 1, step: 0.01, defaultValue: 0.05, source: 'Workflow success_table.base_crit.' },
  { id: 'forge_level', label: 'Forge level', min: 1, max: 10, step: 1, defaultValue: 3, source: 'Alias for building_level.' },
  { id: 'base_duration', label: 'Base duration', min: 1, max: 600, step: 1, defaultValue: 80, source: 'Base workflow duration in ticks.' },
  { id: 'base_duration_ticks', label: 'Base duration ticks', min: 1, max: 600, step: 1, defaultValue: 80, source: 'Alias used by some editor formulas.' },
  { id: 'item_craft_cost_iron', label: 'Item craft cost (iron)', min: 0, max: 500, step: 1, defaultValue: 20, source: 'Dynamic registry example for item_craft_cost_{resource_id}.' },
  { id: 'item_base_stat_attack', label: 'Item base stat (attack)', min: 0, max: 200, step: 1, defaultValue: 10, source: 'Dynamic registry example for item_base_stat_{stat}.' },
  { id: 'resource_gold', label: 'Resource gold', min: 0, max: 10000, step: 10, defaultValue: 500, source: 'Dynamic registry example for resource_{id}.' },
]
const INITIAL_XP_PARAMS = {
  linear: { slope: 120, intercept: 0 },
  polynomial: { coefficient: 100, exponent: 1.6, intercept: 0 },
  exponential: { base: 1.18, multiplier: 90 },
  scurve: { min_xp: 80, max_xp: 3200, inflection_level: 10, steepness: 0.55 },
}

export default function TuningModal({ onClose }) {
  const nodes = useStore((s) => s.nodes)
  const [activeTab, setActiveTab] = useState('formula')
  const [formula, setFormula] = useState('base_duration_ticks * (1 - (worker_skill / 200))')
  const [showAllVariables, setShowAllVariables] = useState(false)
  const [formulaVars, setFormulaVars] = useState(createInitialFormulaVariables())
  const [formulaCopyState, setFormulaCopyState] = useState('')
  const [curveShape, setCurveShape] = useState('polynomial')
  const [curveParams, setCurveParams] = useState(INITIAL_XP_PARAMS)
  const [curveCopyState, setCurveCopyState] = useState('')
  const [economyReport, setEconomyReport] = useState(() => runEconomySimulation(nodes))
  const [economyRunLabel, setEconomyRunLabel] = useState('Current canvas snapshot')

  const formulaState = evaluateFormulaSafe(formula, formulaVars)
  const visibleVariableDefs = showAllVariables
    ? FORMULA_VARIABLE_DEFS
    : FORMULA_VARIABLE_DEFS.filter((def) => DEFAULT_VARIABLE_IDS.includes(def.id))
  const dangerWarnings = formulaState.ok ? getDangerWarnings(formula, formulaState.value, getFormulaDangerZones(projectSchema)) : []
  const curveRows = buildXpCurveRows(curveShape, curveParams[curveShape])
  const highlightedLevel = getCurveHighlightLevel(curveShape, curveParams[curveShape], curveRows)

  const handleVariableChange = (id, value) => {
    setFormulaVars((current) => ({
      ...current,
      [id]: Number(value),
    }))
  }

  const handleCurveParamChange = (shape, key, value) => {
    setCurveParams((current) => ({
      ...current,
      [shape]: {
        ...current[shape],
        [key]: Number(value),
      },
    }))
  }

  const copyFormula = async () => {
    const success = await copyText(formula)
    setFormulaCopyState(success ? 'Copied' : 'Copy failed')
  }

  const copyCurveConfig = async () => {
    const payload = {
      shape: curveShape,
      params: curveParams[curveShape],
    }
    const success = await copyText(JSON.stringify(payload, null, 2))
    setCurveCopyState(success ? 'Copied' : 'Copy failed')
  }

  const recalculateEconomy = () => {
    setEconomyReport(runEconomySimulation(nodes))
    setEconomyRunLabel(`Recalculated from ${nodes.length} node${nodes.length !== 1 ? 's' : ''}`)
  }

  return (
    <div
      onClick={onClose}
      style={overlayStyle}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={modalStyle}
      >
        <div style={headerStyle}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e0e0f0' }}>Tuning utility</div>
            <div style={{ fontSize: 11, color: '#444460', marginTop: 2 }}>Formula testing, XP curve shaping, and passive economy checks.</div>
          </div>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e1e2e', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TAB_OPTIONS.map((tab) => {
            const active = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...tabBtn,
                  background: active ? '#7F77DD22' : '#1e1e2e',
                  borderColor: active ? '#7F77DD55' : '#2a2a3e',
                  color: active ? '#e0e0f0' : '#8888aa',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 20px' }}>
          {activeTab === 'formula' && (
            <FormulaTab
              formula={formula}
              onFormulaChange={setFormula}
              formulaState={formulaState}
              variableDefs={visibleVariableDefs}
              variables={formulaVars}
              showAllVariables={showAllVariables}
              onToggleAllVariables={setShowAllVariables}
              onVariableChange={handleVariableChange}
              dangerWarnings={dangerWarnings}
              onCopy={copyFormula}
              copyState={formulaCopyState}
            />
          )}
          {activeTab === 'xp' && (
            <XpTab
              shape={curveShape}
              onShapeChange={setCurveShape}
              params={curveParams}
              onParamChange={handleCurveParamChange}
              rows={curveRows}
              highlightedLevel={highlightedLevel}
              onCopy={copyCurveConfig}
              copyState={curveCopyState}
            />
          )}
          {activeTab === 'economy' && (
            <EconomyTab
              report={economyReport}
              runLabel={economyRunLabel}
              onRecalculate={recalculateEconomy}
            />
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #2a2a3e', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} style={secondaryBtn}>Close</button>
        </div>
      </div>
    </div>
  )
}

function FormulaTab({
  formula,
  onFormulaChange,
  formulaState,
  variableDefs,
  variables,
  showAllVariables,
  onToggleAllVariables,
  onVariableChange,
  dangerWarnings,
  onCopy,
  copyState,
}) {
  return (
    <div>
      <Section title="Formula">
        <label style={labelStyle}>Formula string</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
          <input
            value={formula}
            onChange={(e) => onFormulaChange(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
            placeholder="base_duration_ticks * (1 - (worker_skill / 200))"
          />
          <button onClick={onCopy} style={primaryBtn('#534AB7')}>Copy</button>
        </div>
        {copyState && <div style={statusText}>{copyState}</div>}
      </Section>

      <Section title="Variables">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: '#8888aa' }}>Adjust the current formula context.</div>
          <button onClick={() => onToggleAllVariables(!showAllVariables)} style={secondaryBtn}>
            {showAllVariables ? 'Show defaults' : 'Show all variables'}
          </button>
        </div>
        <div style={sliderGrid}>
          {variableDefs.map((def) => (
            <div key={def.id} style={sliderCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e0e0f0' }}>{def.label}</div>
                  <div style={{ fontSize: 10, color: '#666680', marginTop: 2 }}>{def.source}</div>
                </div>
                <div style={{ fontSize: 12, color: '#c0c0d8', fontWeight: 700 }}>{formatNumber(variables[def.id])}</div>
              </div>
              <input
                type="range"
                min={def.min}
                max={def.max}
                step={def.step}
                value={variables[def.id]}
                onChange={(e) => onVariableChange(def.id, e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Result">
        {formulaState.ok ? (
          <div style={resultCard}>
            <div style={{ fontSize: 10, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Live result</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#e0e0f0' }}>{formatNumber(formulaState.value)}</div>
          </div>
        ) : (
          <div style={errorCard}>
            <div style={{ fontSize: 12, color: '#E24B4A', fontWeight: 700, marginBottom: 4 }}>Formula error</div>
            <div style={{ fontSize: 12, color: '#c0c0d8' }}>{formulaState.error}</div>
          </div>
        )}
        {dangerWarnings.map((warning) => (
          <div key={warning.message} style={{
            marginTop: 8,
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${warning.color}44`,
            background: `${warning.color}22`,
            color: warning.color,
            fontSize: 12,
            fontWeight: 600,
          }}>
            {warning.message}
          </div>
        ))}
      </Section>
    </div>
  )
}

function XpTab({ shape, onShapeChange, params, onParamChange, rows, highlightedLevel, onCopy, copyState }) {
  const activeParams = params[shape]

  return (
    <div>
      <Section title="Curve shape">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            ['linear', 'Linear'],
            ['polynomial', 'Polynomial'],
            ['exponential', 'Exponential'],
            ['scurve', 'S-Curve'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => onShapeChange(id)}
              style={{
                ...tabBtn,
                background: shape === id ? '#7F77DD22' : '#1e1e2e',
                borderColor: shape === id ? '#7F77DD55' : '#2a2a3e',
                color: shape === id ? '#e0e0f0' : '#8888aa',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Parameters">
        <div style={paramGrid}>
          {getCurveParamFields(shape).map((field) => (
            <div key={field.id}>
              <label style={labelStyle}>{field.label}</label>
              <input
                type="number"
                value={activeParams[field.id]}
                onChange={(e) => onParamChange(shape, field.id, e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="XP per level">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: '#8888aa' }}>Reference curve uses the current expedition spec: `100 * level^1.6`.</div>
          <button onClick={onCopy} style={primaryBtn('#534AB7')}>Copy as JSON</button>
        </div>
        {copyState && <div style={{ ...statusText, marginBottom: 8 }}>{copyState}</div>}
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Level</th>
                <th style={thStyle}>Designer curve</th>
                <th style={thStyle}>Reference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const highlighted = row.level === highlightedLevel
                return (
                  <tr key={row.level} style={{ background: highlighted ? '#7F77DD11' : 'transparent' }}>
                    <td style={tdStyle}>{row.level}</td>
                    <td style={{ ...tdStyle, color: highlighted ? '#e0e0f0' : '#c0c0d8', fontWeight: highlighted ? 700 : 500 }}>
                      {Math.round(row.value)}
                    </td>
                    <td style={{ ...tdStyle, color: '#666680' }}>{Math.round(row.reference)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

function EconomyTab({ report, runLabel, onRecalculate }) {
  return (
    <div>
      <Section title="Simulation">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: '#8888aa' }}>Read-only 10 minute passive simulation across visible buildings.</div>
          <button onClick={onRecalculate} style={primaryBtn('#534AB7')}>Recalculate</button>
        </div>
        <div style={statusText}>{runLabel}</div>
      </Section>

      <Section title="Resource forecast">
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Resource</th>
                <th style={thStyle}>After 1 min</th>
                <th style={thStyle}>After 5 min</th>
                <th style={thStyle}>After 10 min</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.id}>
                  <td style={tdStyle}>{row.label}</td>
                  <td style={tdStyle}>{formatNumber(row.at1)}</td>
                  <td style={tdStyle}>{formatNumber(row.at5)}</td>
                  <td style={tdStyle}>{formatNumber(row.at10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Warnings">
        {report.warnings.length > 0 ? report.warnings.map((warning) => (
          <div key={warning} style={warningRow}>{warning}</div>
        )) : (
          <div style={emptyState}>No economy warnings detected in this simulation window.</div>
        )}
      </Section>
    </div>
  )
}

function createInitialFormulaVariables() {
  return FORMULA_VARIABLE_DEFS.reduce((acc, def) => {
    acc[def.id] = def.defaultValue
    return acc
  }, {})
}

function evaluateFormulaSafe(formulaString, variables) {
  try {
    return { ok: true, value: evaluateFormula(formulaString, variables) }
  } catch (error) {
    return { ok: false, error: error.message || 'Could not evaluate formula.' }
  }
}

function evaluateFormula(formulaString, variables = {}) {
  if (typeof formulaString !== 'string') return 0
  const formula = formulaString.trim()
  if (!formula) return 0
  if (!SAFE_FORMULA_CHARS_RE.test(formula) || BANNED_FORMULA_TOKENS_RE.test(formula)) {
    throw new Error('Unsafe formula')
  }

  const safeVariables = {}
  for (const [key, value] of Object.entries(variables)) {
    if (isAllowedFormulaVariable(key)) {
      safeVariables[key] = Number.isFinite(Number(value)) ? Number(value) : 0
    }
  }

  const identifiers = new Set(formula.match(FORMULA_IDENTIFIER_RE) ?? [])
  for (const identifier of identifiers) {
    if (identifier === 'true' || identifier === 'false' || identifier === 'null') continue
    if (identifier in FORMULA_HELPERS) continue
    if (identifier in safeVariables) continue
    throw new Error(`Unknown formula identifier: ${identifier}`)
  }

  const argNames = [...Object.keys(FORMULA_HELPERS), ...Object.keys(safeVariables)]
  const argValues = [...Object.values(FORMULA_HELPERS), ...Object.values(safeVariables)]
  const fn = Function(...argNames, '"use strict"; return (' + formula + ');')
  const result = fn(...argValues)
  if (typeof result === 'boolean') return result ? 1 : 0
  const numericResult = Number(result)
  if (!Number.isFinite(numericResult)) {
    throw new Error('Formula did not resolve to a finite number')
  }
  return numericResult
}

function isAllowedFormulaVariable(identifier) {
  if (EXACT_FORMULA_VARIABLES.has(identifier)) return true
  return DYNAMIC_FORMULA_VARIABLE_PATTERNS.some((pattern) => pattern.test(identifier))
}

function getFormulaDangerZones(schema) {
  const dangerZones = schema?.['x-tuning-config']?.formula_lab?.danger_zones
  return Array.isArray(dangerZones) && dangerZones.length > 0 ? dangerZones : DEFAULT_DANGER_ZONES
}

function getDangerWarnings(formula, value, dangerZones) {
  const metric = inferFormulaMetric(formula)
  if (!metric) return []

  const zone = dangerZones.find((entry) => entry?.variable === metric)
  if (!zone) return []
  if (Number.isFinite(zone.red_above) && value > zone.red_above) return [{ color: '#E24B4A', message: zone.label }]
  if (Number.isFinite(zone.yellow_above) && value > zone.yellow_above) return [{ color: '#BA7517', message: zone.label }]
  if (Number.isFinite(zone.red_below) && value < zone.red_below) return [{ color: '#E24B4A', message: zone.label }]
  if (Number.isFinite(zone.yellow_below) && value < zone.yellow_below) return [{ color: '#BA7517', message: zone.label }]
  return []
}

function inferFormulaMetric(formula) {
  const lower = String(formula ?? '').toLowerCase()
  if (lower.includes('failure')) return 'failure_chance'
  if (lower.includes('crit')) return 'crit_chance'
  if (lower.includes('duration') || lower.includes('ticks')) return 'duration_ticks'
  if (lower.includes('batch')) return 'batch_size'
  return null
}

function getCurveParamFields(shape) {
  if (shape === 'linear') {
    return [
      { id: 'slope', label: 'Slope' },
      { id: 'intercept', label: 'Intercept' },
    ]
  }
  if (shape === 'polynomial') {
    return [
      { id: 'coefficient', label: 'Coefficient' },
      { id: 'exponent', label: 'Exponent' },
      { id: 'intercept', label: 'Intercept' },
    ]
  }
  if (shape === 'exponential') {
    return [
      { id: 'base', label: 'Base' },
      { id: 'multiplier', label: 'Multiplier' },
    ]
  }
  return [
    { id: 'min_xp', label: 'Min XP' },
    { id: 'max_xp', label: 'Max XP' },
    { id: 'inflection_level', label: 'Inflection level' },
    { id: 'steepness', label: 'Steepness' },
  ]
}

function buildXpCurveRows(shape, params) {
  const rows = []
  for (let level = 1; level <= 20; level += 1) {
    rows.push({
      level,
      value: computeCurveValue(shape, params, level),
      reference: Math.floor(100 * Math.pow(level, 1.6)),
    })
  }
  return rows
}

function computeCurveValue(shape, params, level) {
  if (shape === 'linear') {
    return Math.max(0, Number(params.slope) * level + Number(params.intercept))
  }
  if (shape === 'polynomial') {
    return Math.max(0, Number(params.coefficient) * Math.pow(level, Number(params.exponent)) + Number(params.intercept))
  }
  if (shape === 'exponential') {
    return Math.max(0, Number(params.multiplier) * Math.pow(Number(params.base), level - 1))
  }
  const minXp = Number(params.min_xp)
  const maxXp = Number(params.max_xp)
  const inflection = Number(params.inflection_level)
  const steepness = Number(params.steepness)
  const normalized = 1 / (1 + Math.exp(-steepness * (level - inflection)))
  return Math.max(0, minXp + (maxXp - minXp) * normalized)
}

function getCurveHighlightLevel(shape, params, rows) {
  if (shape === 'scurve') {
    return clampLevel(Number(params.inflection_level))
  }
  if (shape === 'exponential') {
    const deltas = rows.map((row, index) => index === 0 ? row.value : row.value - rows[index - 1].value)
    const baseline = deltas[1] ?? deltas[0] ?? 0
    const kneeIndex = deltas.findIndex((delta, index) => index > 1 && delta >= baseline * 2)
    return kneeIndex >= 0 ? rows[kneeIndex].level : rows[Math.min(9, rows.length - 1)].level
  }
  return null
}

function clampLevel(level) {
  if (!Number.isFinite(level)) return null
  return Math.max(1, Math.min(20, Math.round(level)))
}

function runEconomySimulation(nodes) {
  const resourceNodes = nodes.filter((node) => node.data?.type === 'resource' && node.data?.visible !== false)
  const buildingNodes = nodes.filter((node) => node.data?.type === 'building' && node.data?.visible !== false)
  const amounts = Object.fromEntries(resourceNodes.map((node) => [node.id, 0]))
  const snapshots = { 60: {}, 300: {}, 600: {} }
  const capsReachedAt = {}
  const incomeByResource = {}

  for (const building of buildingNodes) {
    const level = getSimulationBuildingLevel(building.data)
    const levelData = getSimulationLevelData(building.data, level)
    for (const [resourceId, rawRate] of Object.entries(levelData.production ?? {})) {
      const rate = typeof rawRate === 'string'
        ? safeEvaluateFormula(rawRate, { building_level: level, forge_level: level }, 0)
        : Number(rawRate ?? 0)
      incomeByResource[resourceId] = (incomeByResource[resourceId] ?? 0) + rate
      if (!(resourceId in amounts)) amounts[resourceId] = 0
    }
  }

  for (let second = 1; second <= 600; second += 1) {
    for (const [resourceId, income] of Object.entries(incomeByResource)) {
      const resourceNode = resourceNodes.find((node) => node.id === resourceId)
      const cap = Number(resourceNode?.data?.base_cap ?? Infinity)
      const nextAmount = (amounts[resourceId] ?? 0) + Number(income ?? 0)
      amounts[resourceId] = Math.min(nextAmount, cap)
      if (Number.isFinite(cap) && amounts[resourceId] >= cap && capsReachedAt[resourceId] === undefined) {
        capsReachedAt[resourceId] = second
      }
    }

    if (second === 60 || second === 300 || second === 600) {
      snapshots[second] = { ...amounts }
    }
  }

  const rows = resourceNodes.map((node) => ({
    id: node.id,
    label: node.data?.label || node.id,
    at1: snapshots[60][node.id] ?? 0,
    at5: snapshots[300][node.id] ?? 0,
    at10: snapshots[600][node.id] ?? 0,
  }))

  for (const resourceId of Object.keys(incomeByResource)) {
    if (!rows.find((row) => row.id === resourceId)) {
      rows.push({
        id: resourceId,
        label: resourceId,
        at1: snapshots[60][resourceId] ?? 0,
        at5: snapshots[300][resourceId] ?? 0,
        at10: snapshots[600][resourceId] ?? 0,
      })
    }
  }

  const warnings = []
  for (const row of rows) {
    if (capsReachedAt[row.id] !== undefined && capsReachedAt[row.id] <= 300) {
      warnings.push(`${row.label} caps at ${formatSeconds(capsReachedAt[row.id])} - consider raising cap or adding a sink.`)
    }
    if ((incomeByResource[row.id] ?? 0) <= 0 && row.at10 <= 0) {
      warnings.push(`${row.label} has no income source - add a producing building.`)
    }
  }

  if (rows.length === 0) {
    warnings.push('No visible resource nodes found - economy simulation has nothing to measure.')
  }

  return { rows, warnings }
}

function getSimulationBuildingLevel(buildingData) {
  if (Number.isFinite(Number(buildingData.current_level))) return Number(buildingData.current_level)
  if (Number.isFinite(Number(buildingData.max_level))) return Number(buildingData.max_level)
  return Math.max(1, buildingData.levels?.length ?? 1)
}

function getSimulationLevelData(buildingData, level) {
  const levels = buildingData.levels ?? []
  const index = Math.max(0, Math.min(levels.length - 1, Number(level) - 1))
  return levels[index] ?? {}
}

function safeEvaluateFormula(formulaString, variables, fallback = 0) {
  try {
    return evaluateFormula(formulaString, variables)
  } catch {
    return fallback
  }
}

function formatNumber(value) {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric)) return '—'
  if (Math.abs(numeric) >= 1000) return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (Math.abs(numeric % 1) > 0.001) return numeric.toFixed(2)
  return String(Math.round(numeric))
}

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m${String(seconds).padStart(2, '0')}s`
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const modalStyle = {
  background: '#13131f',
  border: '1px solid #2a2a3e',
  borderRadius: 14,
  width: 960,
  maxHeight: '84vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
}

const headerStyle = {
  padding: '14px 20px',
  borderBottom: '1px solid #2a2a3e',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0,
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444460', marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 4 }
const inputStyle = { width: '100%', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 6, padding: '6px 8px', color: '#e0e0f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }
const closeBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }
const secondaryBtn = { background: 'transparent', border: '1px solid #2a2a3e', borderRadius: 7, color: '#8888aa', fontSize: 12, fontWeight: 600, padding: '7px 16px', cursor: 'pointer' }
const primaryBtn = (bg) => ({ background: bg, border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 16px', cursor: 'pointer' })
const tabBtn = { border: '1px solid #2a2a3e', borderRadius: 7, fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: 'pointer' }
const sliderGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }
const sliderCard = { background: '#161625', border: '1px solid #2a2a3e', borderRadius: 10, padding: 12 }
const resultCard = { padding: '16px 18px', borderRadius: 10, border: '1px solid #2a2a3e', background: '#161625' }
const errorCard = { padding: '12px 14px', borderRadius: 10, border: '1px solid #E24B4A44', background: '#E24B4A11' }
const tableWrap = { border: '1px solid #2a2a3e', borderRadius: 10, overflow: 'hidden', background: '#161625' }
const tableStyle = { width: '100%', borderCollapse: 'collapse' }
const thStyle = { textAlign: 'left', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', padding: '10px 12px', borderBottom: '1px solid #2a2a3e' }
const tdStyle = { fontSize: 12, color: '#c0c0d8', padding: '9px 12px', borderBottom: '1px solid #1e1e2e' }
const paramGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }
const warningRow = { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: '#BA751711', borderRadius: 8, border: '1px solid #BA751722', color: '#EF9F27', fontSize: 12, marginBottom: 6 }
const emptyState = { padding: '14px 12px', background: '#161625', border: '1px solid #2a2a3e', borderRadius: 10, color: '#666680', fontSize: 12 }
const statusText = { fontSize: 11, color: '#666680' }
