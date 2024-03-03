import { kebabCase } from "service/kebabCase";
import { Editor, Notice, Plugin, requestUrl, MarkdownView, MarkdownRenderer } from "obsidian";
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
        editorCallback: async (editor: Editor, ctx: MarkdownView) => {
          const selection = editor.getSelection();
          const text = selection ? selection : editor.getValue();
          var context: any[] = [];

          const cursorPosition = editor.getCursor();

          editor.replaceRange("✍️", cursorPosition);

          if (this.settings.contextLocalLinks || this.settings.contextRemoteLinks) {
            const readFile = async (path: string): Promise<string> => {
              var text: string = "";
              var files = this.app.vault.getFiles();
              for (let i = 0; i < files.length; i++ ) {
                const file = files[i];
                if (file?.basename == path) {
                  text = await this.app.vault.read(file);
                }
              };
              return text;
            }
            var contextText: string[] = [];
            var doc = document.createElement("html");
            await MarkdownRenderer.render(this.app, text, doc, ".", ctx);
            var links = doc.querySelectorAll('a');
            for (let i = 0; i <  links.length; i++) {
              const link = links[i];
              if (link.href.startsWith("http") && this.settings.contextRemoteLinks) {
                // fetch the remote url and append the text to contextText
                var response = await requestUrl({method: "GET", url: link.href});
                contextText.push(response.text);
              } else if (link.href.startsWith("app://obsidian.md/") && this.settings.contextLocalLinks) {
                // read the local file and append the text to contextText
                var path = link.href.replace("app://obsidian.md/", "");                
                contextText.push(await readFile(path));
              }
            };

            for (let i = 0; i < contextText.length; i++) {
              var ctxtext = contextText[i];
              // request the ollama server to generate a summary of the text
              var response = await requestUrl({
                method: "POST",
                url: `${this.settings.ollamaUrl}/api/generate`,
                body: JSON.stringify({
                  prompt: this.settings.defaultContextPrompt + "\n\n" + ctxtext,
                  model: command.model || this.settings.defaultModel,
                  context: context,
                  options: {
                    temperature: command.temperature || 0.2,
                  },
                }),
              });
              const steps = response.text
                .split("\n")
                .filter((step) => step && step.length > 0)
                .map((step) => JSON.parse(step));
              context = steps[steps.length - 1].context;
            };
          }

          requestUrl({
            method: "POST",
            url: `${this.settings.ollamaUrl}/api/generate`,
            body: JSON.stringify({
              prompt: command.prompt + "\n\n" + text,
              model: command.model || this.settings.defaultModel,
              context: context,
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
