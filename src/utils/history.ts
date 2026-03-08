import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform } from "node:os";
import type { CopyrightVerdict } from "../types/index.js";

function getStorePath(): string {
    const p = platform();
    const appName = "osmium-desktop";
    
    if (p === "win32") {
        const appData = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
        return join(appData, appName, "config.json");
    } else if (p === "darwin") {
        return join(homedir(), "Library", "Application Support", appName, "config.json");
    } else {
        const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
        return join(configHome, appName, "config.json");
    }
}

interface StoreData {
    checks: CopyrightVerdict[];
}

export async function loadHistory(): Promise<CopyrightVerdict[]> {
    const storePath = getStorePath();
    
    if (!existsSync(storePath)) {
        return [];
    }
    
    try {
        const data = await readFile(storePath, "utf-8");
        const parsed = JSON.parse(data) as StoreData;
        return parsed.checks || [];
    } catch {
        return [];
    }
}

export async function saveToHistory(verdict: CopyrightVerdict): Promise<void> {
    const storePath = getStorePath();
    const storeDir = join(storePath, "..");
    
    if (!existsSync(storeDir)) {
        await mkdir(storeDir, { recursive: true });
    }
    
    const existing = await loadHistory();
    const checks = [verdict, ...existing].slice(0, 50);
    
    const data: StoreData = { checks };
    await writeFile(storePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function clearHistory(): Promise<void> {
    const storePath = getStorePath();
    
    if (existsSync(storePath)) {
        const data: StoreData = { checks: [] };
        await writeFile(storePath, JSON.stringify(data, null, 2), "utf-8");
    }
}

export function getStorePathForDisplay(): string {
    return getStorePath();
}
