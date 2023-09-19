import { OllamaCommand } from "model/OllamaCommand";

export interface OllamaSettings {
  ollamaUrl: string;
  commands: OllamaCommand[];
}
