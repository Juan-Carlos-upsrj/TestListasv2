
import { AppState } from './types';

export {};

declare global {
  interface Window {
    electronAPI: {
      getData: () => Promise<Partial<AppState>>;
      saveData: (data: AppState) => Promise<void>;
      getVersion: () => Promise<string>;
      
      onUpdateAvailable: (callback: () => void) => void;
      onUpdateDownloaded: (callback: () => void) => void;
      onUpdateNotAvailable: (callback: () => void) => void;
      onUpdateError: (callback: (message: string) => void) => void;
      onDownloadProgress: (callback: (percent: number) => void) => void;
      
      restartApp: () => void;
      checkForUpdates: () => void;
    };
  }
}
