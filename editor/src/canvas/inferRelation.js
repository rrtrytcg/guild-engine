export function inferRelation(sourceType, targetType) {
  // Full lookup table from x-connection-rules in the schema
  const rules = {
    resource:        { building: 'produces',         upgrade: 'modifies' },
    item:            { loot_table: 'drops_from',      recipe: 'consumes',
                      crafting_recipe: 'consumes' },
    loot_table:      { expedition: 'drops_from',      boss_expedition: 'drops_from',
                      building: 'drops_from' },
    recipe:          { building: 'hosts_recipe',      item: 'produces' },
    crafting_recipe: { building_workflow: 'used_by',  item: 'produces' },
    hero_class:      { building: 'trains',            expedition: 'preferred_class',
                      boss_expedition: 'preferred_class',
                      building_workflow: 'assigned_to' },
    ability:         { hero_class: 'trains' },
    building:        { resource: 'produces',          recipe: 'hosts_recipe',
                      crafting_recipe: 'hosts_recipe',
                      building_workflow: 'available_at',
                      upgrade: 'unlocks',            expedition: 'unlocks',
                      boss_expedition: 'unlocks',    act: 'gates' },
    building_workflow:{ building: 'available_at',    resource: 'produces',
                       item: 'produces',             crafting_recipe: 'used_by' },
    building_upgrade: { building: 'hosts',           building_workflow: 'unlocks' },
    upgrade:         { resource: 'modifies',         building: 'modifies',
                      hero_class: 'modifies',        expedition: 'modifies' },
    expedition:      { loot_table: 'drops_from',     act: 'gates',
                      event: 'triggers' },
    boss_expedition: { loot_table: 'drops_from',     act: 'gates',
                      event: 'triggers' },
    act:             { building: 'unlocks',           expedition: 'unlocks',
                      boss_expedition: 'unlocks',    upgrade: 'unlocks',
                      event: 'triggers' },
    event:           { faction: 'affects_rep',        act: 'triggers' },
    faction:         { upgrade: 'gates',             building: 'gates',
                      expedition: 'gates',           event: 'affects_rep' },
    prestige:        { act: 'gates',                 resource: 'produces' },
  }
  return rules[sourceType]?.[targetType] ?? 'unlocks'
}

export function relationColor(relation) {
  const map = {
    produces: '#1D9E75',
    drops_from: '#1D9E75',
    consumes: '#BA7517',
    used_by: '#BA7517',
    unlocks: '#7F77DD',
    gates: '#7F77DD',
    modifies: '#378ADD',
    trains: '#D4537E',
    assigned_to: '#D4537E',
    triggers: '#639922',
    affects_rep: '#639922',
  }
  return map[relation] ?? '#444466'
}
