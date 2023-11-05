import { OllamaCommand } from "model/OllamaCommand";

export interface OllamaSettings {
  ollamaUrl: string;
  defaultModel: string;
  commands: OllamaCommand[];
}
