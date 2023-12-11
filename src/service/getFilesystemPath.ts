import { FileSystemAdapter } from "obsidian";

export const getFilesystemPath = (path: string = '/') => {
  const adapter = app.vault.adapter;
  if (adapter instanceof FileSystemAdapter) {
      return adapter.getBasePath() + path
  }
  return '';
}
