import { App, PluginSettingTab, Setting } from "obsidian";
import { Ollama } from "Ollama";

export class OllamaSettingTab extends PluginSettingTab {
  plugin: Ollama;

  constructor(app: App, plugin: Ollama) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("LlamaIndex Connector URL")
      .setDesc("URL of the python server for indexing and query (e.g. http://localhost:5000)")
      .addText((text) =>
        text
          .setPlaceholder("http://localhost:5000")
          .setValue(this.plugin.settings.llamaIndexUrl)
          .onChange(async (value) => {
            this.plugin.settings.llamaIndexUrl = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
