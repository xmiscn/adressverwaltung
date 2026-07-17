// Duenne Schnittstelle zu den Rust-Befehlen (Tauri `invoke`).

import { invoke } from "@tauri-apps/api/core";

export interface VaultStatus {
  initialized: boolean;
  unlocked: boolean;
}

export function getStatus(): Promise<VaultStatus> {
  return invoke<VaultStatus>("vault_status");
}

export function initializeVault(password: string): Promise<void> {
  return invoke<void>("initialize_vault", { password });
}

/** Entsperrt den Tresor und liefert die Kontakte als JSON-Text zurueck. */
export function unlockVault(password: string): Promise<string> {
  return invoke<string>("unlock_vault", { password });
}

export function saveContacts(data: string): Promise<void> {
  return invoke<void>("save_contacts", { data });
}

export function lockVault(): Promise<void> {
  return invoke<void>("lock_vault");
}

export function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  return invoke<void>("change_password", { oldPassword, newPassword });
}

/** Liest eine vom Nutzer gewählte Textdatei (Import). */
export function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

/** Schreibt Text in eine vom Nutzer gewählte Datei (Export). */
export function writeTextFile(path: string, content: string): Promise<void> {
  return invoke<void>("write_text_file", { path, content });
}

/** Speicherort des Tresors (zur Anzeige). */
export function vaultPath(): Promise<string> {
  return invoke<string>("vault_path");
}

/** Sichert den verschlüsselten Tresor an den gewählten Ort. */
export function backupVault(ziel: string): Promise<void> {
  return invoke<void>("backup_vault", { ziel });
}

/** Spielt eine Sicherung ein; die Sitzung wird danach gesperrt. */
export function restoreVault(quelle: string): Promise<void> {
  return invoke<void>("restore_vault", { quelle });
}
