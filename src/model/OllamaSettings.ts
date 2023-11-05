import { OllamaCommand } from "model/OllamaCommand";

export interface OllamaSettings {
  ollamaUrl: string;
  stream: boolean;
  defaultModel: string;
  commands: OllamaCommand[];
}
