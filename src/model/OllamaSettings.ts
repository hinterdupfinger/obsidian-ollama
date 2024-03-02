import { OllamaCommand } from "model/OllamaCommand";

export interface OllamaSettings {
  ollamaUrl: string;
  defaultModel: string;
  commands: OllamaCommand[];
  contextLocalLinks: boolean;
  contextRemoteLinks: boolean;
  defaultContextPrompt: string;
}
