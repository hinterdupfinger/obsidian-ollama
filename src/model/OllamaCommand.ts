export interface OllamaCommand {
  name: string;
  prompt: string;
  model?: string;
  temperature?: number;
}
