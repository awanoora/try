export type VoiceId = 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';

export interface VoiceOption {
  id: VoiceId;
  name: string;
  genderLabel: string;
  character: string;
  recommended?: boolean;
}

export interface StylePreset {
  id: string;
  label: string;
  summary: string;
  prompt: string;
}

export interface ScriptTemplate {
  id: string;
  title: string;
  occasion: string;
  content: string;
}

export interface GeneratedTake {
  id: string;
  createdAt: string;
  text: string;
  voiceName: VoiceId;
  styleLabel: string;
  stylePrompt: string;
  audioUrl: string;
  mimeType: string;
  durationSeconds: number;
}
