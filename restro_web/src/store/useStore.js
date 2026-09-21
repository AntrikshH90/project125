import { create } from 'zustand';

export const useStore = create((set) => ({
  loaded: false,
  loadingProgress: 0,
  loadingStatus: 'Initializing...',

  currentZone: 'entrance',
  discoveredZones: new Set(['entrance']),
  cameraMode: 'free',

  audioEnabled: false,
  audioAvailable: true,

  gyroEnabled: false,

  tourActive: false,
  tourStep: 0,

  activeHotspot: null,
  hoveredHotspot: null,

  setLoaded: (loaded) => set({ loaded }),
  setLoadingProgress: (progress, status) => set({ loadingProgress: progress, loadingStatus: status }),
  setZone: (zone) => set((state) => {
    const discovered = new Set(state.discoveredZones);
    discovered.add(zone);
    return { currentZone: zone, discoveredZones: discovered, activeHotspot: null };
  }),
  toggleAudio: () => set((s) => (s.audioAvailable ? { audioEnabled: !s.audioEnabled } : s)),
  setAudioAvailable: (ok) => set({ audioAvailable: ok, audioEnabled: ok ? undefined : false }),
  enableGyro: () => set({ gyroEnabled: true }),
  startTour: () => set({ tourActive: true, tourStep: 0, cameraMode: 'tour' }),
  endTour: () => set({ tourActive: false, cameraMode: 'free' }),
  nextTourStep: () => set((state) => ({ tourStep: state.tourStep + 1 })),
  setHotspot: (id) => set({ activeHotspot: id }),
  hoverHotspot: (id) => set({ hoveredHotspot: id })
}));
