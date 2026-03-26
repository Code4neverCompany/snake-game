import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Expose a safe subset of electron APIs to the renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
}
