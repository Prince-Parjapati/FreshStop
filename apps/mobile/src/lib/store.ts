import { create } from 'zustand';
import type { Gate } from './licence';
interface S { gate: Gate | null; setGate: (g: Gate | null) => void; }
export const useApp = create<S>((set) => ({ gate: null, setGate: (gate) => set({ gate }) }));
