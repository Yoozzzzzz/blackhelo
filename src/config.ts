const env = import.meta.env as Record<string, string | undefined>;

function numberFromEnv(key: string, fallback: number) {
  const value = Number(env[key]);
  return Number.isFinite(value) ? value : fallback;
}

export const config = {
  growthSpeed: numberFromEnv('VITE_GROWTH_SPEED', 1),
  cameraZoom: numberFromEnv('VITE_CAMERA_ZOOM', 0.38),
  mapSize: numberFromEnv('VITE_MAP_SIZE', 110),
};
