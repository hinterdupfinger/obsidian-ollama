import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { DEFAULT_SETTINGS } from "data/defaultSettings";
import { OllamaCommand } from "model/OllamaCommand";
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
      .setName("Ollama URL")
      .setDesc("URL of the Ollama server (e.g. http://localhost:11434)")
      .addText((text) =>
        text
          .setPlaceholder("http://localhost:11434")
          .setValue(this.plugin.settings.ollamaUrl)
          .onChange(async (value) => {
            this.plugin.settings.ollamaUrl = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("default model")
      .setDesc("Name of the default ollama model to use for prompts")
      .addText((text) =>
        text
          .setPlaceholder("llama2")
          .setValue(this.plugin.settings.defaultModel)
          .onChange(async (value) => {
            this.plugin.settings.defaultModel = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Commands" });

    const newCommand: OllamaCommand = {
      name: "",
      prompt: "",
      model: "",
      temperature: undefined,
    };

    new Setting(containerEl).setName("New command name").addText((text) => {
      text.setPlaceholder("e.g. Summarize selection");
      text.onChange(async (value) => {
        newCommand.name = value;
      });
    });

    new Setting(containerEl)
      .setName("New command prompt")
      .addTextArea((text) => {
        text.setPlaceholder(
          "e.g. Act as a writer. Summarize the text in a view sentences highlighting the key takeaways. Output only the text and nothing else, do not chat, no preamble, get to the point."
        );
        text.onChange(async (value) => {
          newCommand.prompt = value;
        });
      });

    new Setting(containerEl).setName("New command model").addText((text) => {
      text.setPlaceholder("e.g. llama2");
      text.onChange(async (value) => {
        newCommand.model = value;
      });
    });

    new Setting(containerEl)
      .setName("New command temperature")
      .addSlider((slider) => {
        slider.setLimits(0, 1, 0.01);
        slider.setValue(0.2);
        slider.onChange(async (value) => {
          newCommand.temperature = value;
        });
      });

    new Setting(containerEl)
      .setDesc("This requires a reload of obsidian to take effect.")
      .addButton((button) =>
        button.setButtonText("Add Command").onClick(async () => {
          if (!newCommand.name) {
            new Notice("Please enter a name for the command.");
            return;
          }

          if (
            this.plugin.settings.commands.find(
              (command) => command.name === newCommand.name
            )
          ) {
            new Notice(
              `A command with the name "${newCommand.name}" already exists.`
            );
            return;
          }

          if (!newCommand.prompt) {
            new Notice("Please enter a prompt for the command.");
            return;
          }

          if (!newCommand.model) {
            new Notice("Please enter a model for the command.");
            return;
          }

          this.plugin.settings.commands.push(newCommand);
          await this.plugin.saveSettings();
          this.display();
        })
      );

    containerEl.createEl("h4", { text: "Existing Commands" });

    this.plugin.settings.commands.forEach((command) => {
      new Setting(containerEl)
        .setName(command.name)
        .setDesc(`${command.prompt} - ${command.model}`)
        .addButton((button) =>
          button.setButtonText("Remove").onClick(async () => {
            this.plugin.settings.commands =
              this.plugin.settings.commands.filter(
                (c) => c.name !== command.name
              );
            await this.plugin.saveSettings();
            this.display();
          })
        );
    });

    containerEl.createEl("h4", { text: "Reset Commands" });

    new Setting(containerEl)
      .setName("Update Commands")
      .setDesc(
        "Update commands to the default commands. This cannot be undone and will overwrite some commands by matching names. This requires a reload of obsidian to take effect."
      )
      .addButton((button) => {
        button.setWarning();
        return button.setButtonText("Update").onClick(async () => {
          DEFAULT_SETTINGS.commands.forEach((command) => {
            const existingCommand = this.plugin.settings.commands.find(
              (c) => c.name === command.name
            );

            if (existingCommand) {
              existingCommand.prompt = command.prompt;
              existingCommand.model = command.model;
              existingCommand.temperature = command.temperature;
            } else {
              this.plugin.settings.commands.push(command);
            }
          });
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName("Reset Commands")
      .setDesc(
        "Reset all commands to the default commands. This cannot be undone and will delete all your custom commands. This requires a reload of obsidian to take effect."
      )
      .addButton((button) => {
        button.setWarning();
        return button.setButtonText("Reset").onClick(async () => {
          this.plugin.settings.commands = DEFAULT_SETTINGS.commands;
          await this.plugin.saveSettings();
          this.display();
        });
      });
  }
}
