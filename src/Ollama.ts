import { Notice, Plugin, requestUrl } from "obsidian";
import { OllamaSettingTab } from "OllamaSettingTab";
import { DEFAULT_SETTINGS } from "data/defaultSettings";
import { OllamaSettings } from "model/OllamaSettings";
import { getFilesystemPath } from "service/getFilesystemPath";
import { ChatModal } from "modal/ChatModal";

export class Ollama extends Plugin {
  settings: OllamaSettings;

  async onload() {
    await this.loadSettings();
    this.runStartupIndexing();
    this.registerEvents()
    this.addPromptCommands();
    this.addSettingTab(new OllamaSettingTab(this.app, this));
 }


  private registerEvents() {
    // this.registerEvent(this.app.vault.on('create', this.createEvent))
    // this.registerEvent(this.app.vault.on('delete', this.deleteEvent))
    // this.registerEvent(this.app.vault.on('modify', this.modifyEvent))
    // this.registerEvent(this.app.vault.on('rename', this.renameEvent))
  }

  private addPromptCommands() {
    this.addCommand({
      id: "ask-your-ai",
      name: "AI Chat",
      callback: () => {
        new ChatModal(this.app, this.settings.llamaIndexUrl).open();
      },
    });
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async runStartupIndexing() {
    requestUrl({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      url: `${this.settings.llamaIndexUrl}/indexing`,
      body: JSON.stringify({
        path: getFilesystemPath()
      })
    })
    .then(response => new Notice(`Ollama indexing: ${response.text}`))
    .catch((error) => {
      new Notice(`Error while indexing the store ${error}`);
    })
  }
}
