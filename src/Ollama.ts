import { kebabCase } from "service/kebabCase";
import { Editor, Notice, Plugin, requestUrl } from "obsidian";
import { OllamaSettingTab } from "OllamaSettingTab";
import { DEFAULT_SETTINGS } from "data/defaultSettings";
import { OllamaSettings } from "model/OllamaSettings";

export class Ollama extends Plugin {
  settings: OllamaSettings;

  async onload() {
    await this.loadSettings();
    this.addPromptCommands();
    this.addSettingTab(new OllamaSettingTab(this.app, this));
  }

  private addPromptCommands() {
    this.settings.commands.forEach((command) => {
      this.addCommand({
        id: kebabCase(command.name),
        name: command.name,
        editorCallback: (editor: Editor) => {
          const selection = editor.getSelection();
          const text = selection ? selection : editor.getValue();

          const cursorPosition = editor.getCursor();

          editor.replaceRange("✍️", cursorPosition);

          requestUrl({
            method: "POST",
            url: `${this.settings.ollamaUrl}/api/generate`,
            body: JSON.stringify({
              prompt: command.prompt + "\n\n" + text,
              model: command.model || this.settings.defaultModel,
              options: {
                temperature: command.temperature || 0.2,
              },
            }),
          })
            .then((response) => {
              const steps = response.text
                .split("\n")
                .filter((step) => step && step.length > 0)
                .map((step) => JSON.parse(step));

              editor.replaceRange(
                steps
                  .map((step) => step.response)
                  .join("")
                  .trim(),
                cursorPosition,
                {
                  ch: cursorPosition.ch + 1,
                  line: cursorPosition.line,
                }
              );
            })
            .catch((error) => {
              new Notice(`Error while generating text: ${error.message}`);
              editor.replaceRange("", cursorPosition, {
                ch: cursorPosition.ch + 1,
                line: cursorPosition.line,
              });
            });
        },
      });
    });
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
