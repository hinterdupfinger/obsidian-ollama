import { kebabCase } from "service/kebabCase";
import { Editor, Notice, Plugin } from "obsidian";
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

          fetch(`${this.settings.ollamaUrl}/api/generate`, {
            method: "POST",
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              prompt: command.prompt + "\n\n" + text,
              model: command.model || this.settings.defaultModel,
              options: {
                temperature: command.temperature || 0.2,
              },
              stream: true, // Enable streaming responses
            }),
          })
            .then(response => {
              if (!response.body) {
                throw new Error('ReadableStream not yet supported in this browser.');
              }
              const reader = response.body.getReader();
              let decoder = new TextDecoder();
              let contentBuffer = '';

              function read() {
                reader.read().then(({ done, value }) => {
                  if (done) {
                    // This is the end of the stream
                    if (contentBuffer.trim() !== "") {
                      insertContentAtEnd(contentBuffer);
                    }
                    return;
                  }
                  const chunk = decoder.decode(value, { stream: true });
                  contentBuffer += chunk;

                  let pos;
                  while ((pos = contentBuffer.indexOf('\n')) >= 0) {
                    let line = contentBuffer.slice(0, pos);
                    contentBuffer = contentBuffer.slice(pos + 1);

                    try {
                      let responseObj = JSON.parse(line);
                      if (!responseObj.done) {
                        insertContentAtEnd(responseObj.response);
                      } else {
                        // Final object with 'done' true
                        insertContentAtEnd(responseObj.response);
                        return;
                      }
                    } catch (e) {
                      console.error('Error parsing JSON:', e);
                    }
                  }
                  read(); // Read the next chunk
                }).catch(error => {
                  console.error('Error while reading the stream', error);
                  new Notice(`Error while generating text: ${error.message}`);
                });
              }
              function insertContentAtEnd(text: string) {
                // Move the cursor to the end of the editor content
                let lastLine = editor.lineCount() - 1;
                let lastLineLength = editor.getLine(lastLine).length;
                let endCursorPos = { line: lastLine, ch: lastLineLength };

                // Insert the content at the end of the editor content
                editor.replaceRange(text, endCursorPos);

                // No need to update cursor position since we're always appending at the end
              }
              read(); // Start reading the stream
            }).catch(error => {
            console.error('Error in fetch request:', error);
            new Notice(`Error while generating text: ${error.message}. Is Ollama running?`);
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
