import { kebabCase } from "service/kebabCase";
import {Editor, Notice, Plugin, requestUrl} from "obsidian";
import { OllamaSettingTab } from "OllamaSettingTab";
import { DEFAULT_SETTINGS } from "data/defaultSettings";
import { OllamaSettings } from "model/OllamaSettings";

export class Ollama extends Plugin {
  settings: OllamaSettings;

  async onload() {
    await this.loadSettings();

    this.settings.stream ? this.addPromptCommandsStream() : this.addPromptCommands();
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

  private addPromptCommandsStream() {

    this.settings.commands.forEach((command) => {
      this.addCommand({
        id: kebabCase(command.name),
        name: command.name,
        editorCallback: (editor: Editor) => {

          let reader: ReadableStreamDefaultReader;
          const onKeyDown = () => {
            console.log("Key pressed")
            reader.cancel();
            document.removeEventListener('keydown', onKeyDown); // remove the event listener
            new Notice('Ollama: Stream cancelled by user');
            //set cursor to end of editor
            const lastLine = editor.lineCount() - 1;
            const lastLineLength = editor.getLine(lastLine).length;
            const endCursorPos = { line: lastLine, ch: lastLineLength };
            editor.setCursor(endCursorPos);
          };

          const selection = editor.getSelection();
          const text = selection ? selection : editor.getValue();
          const cursorPosition = editor.getCursor();

          editor.replaceRange("⏳", cursorPosition);

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
              // Listen for the Escape key
              document.addEventListener('keydown', onKeyDown);

              if (!response.body) {
                throw new Error('ReadableStream not yet supported in this browser.');
              }
              reader = response.body.getReader();
              const decoder = new TextDecoder();
              let contentBuffer = '';

              //remove the ⏳
                editor.replaceRange("", cursorPosition, {
                    ch: cursorPosition.ch + 1,
                    line: cursorPosition.line,
                });

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

                  let pos; // Position of the newline
                  while ((pos = contentBuffer.indexOf('\n')) >= 0) {
                    const line = contentBuffer.slice(0, pos);
                    contentBuffer = contentBuffer.slice(pos + 1);

                    try {
                      const responseObj = JSON.parse(line);
                      if (!responseObj.done) {

                        insertContentAtEnd(responseObj.response);
                      } else {
                        // Final object with 'done' true
                        insertContentAtEnd(responseObj.response);
                        document.removeEventListener('keydown', onKeyDown); // remove the event listener
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
                })
              }
              function insertContentAtEnd(text: string) {
                // Move the cursor to the end of the editor content
                const lastLine = editor.lineCount() - 1;
                const lastLineLength = editor.getLine(lastLine).length;
                const endCursorPos = { line: lastLine, ch: lastLineLength };

                // Insert the content at the end of the editor content
                editor.replaceRange(text, endCursorPos);

                // Move the cursor to the end of the editor content
                editor.setCursor(endCursorPos);

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
