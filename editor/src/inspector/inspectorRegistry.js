export const INSPECTOR_IMPORTERS = {
  resource: () => import('./ResourceInspector.jsx'),
  hero_class: () => import('./HeroClassInspector.jsx'),
  item: () => import('./ItemInspector.jsx'),
  loot_table: () => import('./LootTableInspector.jsx'),
  recipe: () => import('./RecipeInspector.jsx'),
  crafting_recipe: () => import('./CraftingRecipeInspector.jsx'),
  ability: () => import('./AbilityInspector.jsx'),
  building: () => import('./BuildingInspector.jsx'),
  upgrade: () => import('./UpgradeInspector.jsx'),
  building_workflow: () => import('./BuildingWorkflowInspector.jsx'),
  building_upgrade: () => import('./BuildingUpgradeInspector.jsx'),
  expedition: () => import('./ExpeditionInspector.jsx'),
  boss_expedition: () => import('./BossExpeditionInspector.jsx'),
  act: () => import('./ActInspector.jsx'),
  event: () => import('./EventInspector.jsx'),
  faction: () => import('./FactionInspector.jsx'),
  prestige: () => import('./PrestigeInspector.jsx'),
  blueprint: () => import('./BlueprintInspector.jsx'),
}

export function getInspectorImporter(type) {
  return INSPECTOR_IMPORTERS[type] ?? null
}
