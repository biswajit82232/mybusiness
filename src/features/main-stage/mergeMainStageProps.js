/**
 * Flattens grouped MainStage inputs into a single props object (spread into `<MainStage />`).
 * Keeps App.jsx organized without changing MainStage’s flat prop contract.
 */
export function mergeMainStageProps(route, data, actions) {
  return { ...route, ...data, ...actions };
}
