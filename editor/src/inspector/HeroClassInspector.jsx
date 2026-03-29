import { Field, TextArea, Select, Section, StatBlock, SearchableDropdown, useNodeUpdater } from './FormPrimitives'

const SLOT_OPTIONS = ['weapon', 'armor', 'accessory', 'relic']
const HERO_TYPES = ['combat', 'artisan']
const XP_SOURCE_OPTIONS = ['expedition_completion', 'building_jobs_completed', 'both']

function CostEditor({ value, onChange }) {
  const add = () => onChange([...value, { resource_id: '', amount: 0 }])
  const upd = (i, patch) => onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const rem = (i) => onChange(value.filter((_, idx) => idx !== i))
  return (
    <div style={{ marginBottom: 10 }}>
      {value.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <SearchableDropdown
              label={i === 0 ? 'Resource' : ''}
              value={c.resource_id}
              onChange={(v) => upd(i, { resource_id: v })}
              typeFilter="resource"
              placeholder="Search resources"
            />
          </div>
          <div style={{ width: 90 }}>
            <Field label={i === 0 ? 'Amount' : ''} value={c.amount} onChange={(v) => upd(i, { amount: Number(v) })} type="number" />
          </div>
          <button onClick={() => rem(i)} style={xBtn}>×</button>
        </div>
      ))}
      <button onClick={add} style={addBtn}>+ cost</button>
    </div>
  )
}

export default function HeroClassInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const isArtisan = (d.hero_type ?? 'combat') === 'artisan'
  const buildingAffinity = d.building_affinity ?? []
  const specializations = d.specializations ?? []

  const toggleSlot = (slot) => {
    const current = d.slots ?? []
    const next = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot]
    update({ slots: next })
  }

  const setHeroType = (heroType) => {
    update({
      hero_type: heroType,
      combat_eligible: heroType === 'artisan' ? false : d.combat_eligible ?? true,
      assignment_target: heroType === 'artisan' ? 'building' : 'expedition',
      xp_source: heroType === 'artisan' ? (d.xp_source ?? 'building_jobs_completed') : (d.xp_source ?? 'expedition_completion'),
    })
  }

  const updateSpecialization = (index, value) => {
    update({
      specializations: specializations.map((entry, idx) => (idx === index ? value : entry)),
    })
  }

  const addSpecialization = () => {
    update({ specializations: [...specializations, ''] })
  }

  const removeSpecialization = (index) => {
    update({ specializations: specializations.filter((_, idx) => idx !== index) })
  }

  const updateAffinity = (index, value) => {
    update({
      building_affinity: buildingAffinity.map((entry, idx) => (idx === index ? value : entry)),
    })
  }

  const addAffinity = () => {
    update({ building_affinity: [...buildingAffinity, ''] })
  }

  const removeAffinity = (index) => {
    update({ building_affinity: buildingAffinity.filter((_, idx) => idx !== index) })
  }

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <Field label="Icon (emoji)" value={d.icon} onChange={(v) => update({ icon: v })} placeholder="⚔️" />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />
      <Select label="Hero type" value={d.hero_type ?? 'combat'} onChange={setHeroType} options={HERO_TYPES} />

      {isArtisan && (
        <>
          <Section title="Artisan" />
          <LockedToggle label="Combat eligible" value={false} />
          <Select label="XP source" value={d.xp_source ?? 'building_jobs_completed'} onChange={(v) => update({ xp_source: v })} options={XP_SOURCE_OPTIONS} />

          <div style={{ marginBottom: 12 }}>
            <div style={subLabelStyle}>Specializations</div>
            {specializations.map((entry, index) => (
              <div key={index} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Field label={index === 0 ? 'Specialization' : ''} value={entry} onChange={(v) => updateSpecialization(index, v)} placeholder="smithing" />
                </div>
                <button onClick={() => removeSpecialization(index)} style={xBtn}>×</button>
              </div>
            ))}
            <button onClick={addSpecialization} style={addBtn}>+ specialization</button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={subLabelStyle}>Building affinity</div>
            {buildingAffinity.map((entry, index) => (
              <div key={`${entry}-${index}`} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <SearchableDropdown
                    label={index === 0 ? 'Building' : ''}
                    value={entry}
                    onChange={(v) => updateAffinity(index, v)}
                    typeFilter="building"
                    placeholder="Search buildings"
                  />
                </div>
                <button onClick={() => removeAffinity(index)} style={xBtn}>×</button>
              </div>
            ))}
            <button onClick={addAffinity} style={addBtn}>+ building</button>
          </div>
        </>
      )}

      <Section title="Equipment slots" />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {SLOT_OPTIONS.map((slot) => {
          const active = (d.slots ?? []).includes(slot)
          return (
            <button
              key={slot}
              onClick={() => toggleSlot(slot)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: active ? '1px solid #7F77DD' : '1px solid #2a2a3e',
                background: active ? '#7F77DD22' : '#1e1e2e',
                color: active ? '#7F77DD' : '#666680',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: active ? 600 : 400,
              }}
            >
              {slot}
            </button>
          )
        })}
      </div>

      {!isArtisan && (
        <>
          <Section title="Recruit cost" />
          <CostEditor value={d.recruit_cost ?? []} onChange={(v) => update({ recruit_cost: v })} />
        </>
      )}

      <Section title="Base stats" />
      <StatBlock label="Base stats" value={d.base_stats} onChange={(v) => update({ base_stats: v })} />

      <Section title="Stat growth (per level)" />
      <StatBlock label="Growth" value={d.stat_growth} onChange={(v) => update({ stat_growth: v })} />
    </div>
  )
}

function LockedToggle({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, opacity: 0.7 }}>
      <span style={{ fontSize: 12, color: '#c0c0d8' }}>{label}</span>
      <div
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: value ? '#7F77DD' : '#2a2a3e',
          position: 'relative',
          flexShrink: 0,
          cursor: 'not-allowed',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: value ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
          }}
        />
      </div>
    </div>
  )
}

const subLabelStyle = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#666680',
  marginBottom: 4,
}

const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 14, padding: '0 2px' }
const addBtn = { fontSize: 10, padding: '3px 8px', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 4, color: '#666680', cursor: 'pointer' }
