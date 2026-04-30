import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type KeySource = 'runtime' | 'environment' | 'none';

interface PersistedSettings { openAiApiKey?: string }

export interface SafeSettingsStatus {
  openAiConfigured: boolean;
  openAiKeySource: KeySource;
  extractionProvider: 'mock' | 'fixture' | 'openai';
  openAiModel: string;
  timeoutMs: number;
}

export class RuntimeSettingsService {
  private runtimeKey: string | undefined;
  private readonly settingsPath = path.resolve(process.cwd(), 'storage/local-settings.json');
  private loaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = await readFile(this.settingsPath, 'utf8');
      const parsed = JSON.parse(raw) as PersistedSettings;
      this.runtimeKey = typeof parsed.openAiApiKey === 'string' && parsed.openAiApiKey.trim() ? parsed.openAiApiKey.trim() : undefined;
    } catch {
      this.runtimeKey = undefined;
    }
  }

  private async persist(): Promise<void> {
    await mkdir(path.dirname(this.settingsPath), { recursive: true });
    const payload: PersistedSettings = {};
    if (this.runtimeKey) payload.openAiApiKey = this.runtimeKey;
    await writeFile(this.settingsPath, JSON.stringify(payload, null, 2));
  }

  async setOpenAiKey(apiKey: string): Promise<void> {
    await this.ensureLoaded();
    this.runtimeKey = apiKey.trim();
    await this.persist();
  }

  async clearOpenAiKey(): Promise<void> {
    await this.ensureLoaded();
    this.runtimeKey = undefined;
    await this.persist();
  }

  async getEffectiveOpenAiKey(): Promise<string | undefined> {
    await this.ensureLoaded();
    return this.runtimeKey ?? (process.env.OPENAI_API_KEY?.trim() || undefined);
  }

  async getOpenAiKeySource(): Promise<KeySource> {
    await this.ensureLoaded();
    if (this.runtimeKey) return 'runtime';
    if (process.env.OPENAI_API_KEY?.trim()) return 'environment';
    return 'none';
  }

  async getSafeStatus(extractionProvider: 'mock' | 'fixture' | 'openai', openAiModel: string): Promise<SafeSettingsStatus> {
    const source = await this.getOpenAiKeySource();
    return {
      openAiConfigured: source !== 'none',
      openAiKeySource: source,
      extractionProvider,
      openAiModel,
      timeoutMs: Number(process.env.EXTRACTION_TIMEOUT_MS ?? 120000)
    };
  }
}
