import fs from "node:fs";
import path from "node:path";
import { createSoundAssetUrl } from "@/lib/staticAssets";
import operatorCatalog from "@/data/operator-voice-assets.json";
import voiceCatalog from "@/data/voice-assets.json";
import spokenVoiceLanguages from "@/data/voice-spoken-languages.json";

export type VoiceCategory = "unit" | "operator";
export type VoiceLanguage = "ko" | "ja";

type SpokenVoiceException = {
  category: VoiceCategory | "battle";
  bundleId: string;
  languages: VoiceLanguage[];
  sourceLocales?: Partial<Record<VoiceLanguage, VoiceLanguage>>;
};

const voiceLanguageExceptions = spokenVoiceLanguages.overrides as SpokenVoiceException[];

const operatorVoicePaths = new Set(operatorCatalog.paths);
const voicePaths = new Set(voiceCatalog.paths);
const CHARACTER_VOICE_BASE_URL =
  "https://raw.githubusercontent.com/terabraincs/CS_Voice/main/unit_voice";

function isVoiceCategory(value: string): value is VoiceCategory {
  return value === "unit" || value === "operator";
}

/** A locale bundle can contain a recording in another spoken language.
 * Apply only explicit exceptions, not guesses based on matching audio hashes. */
export function isVoiceLanguageAvailable(
  category: VoiceCategory | "battle",
  bundleId: string,
  language: VoiceLanguage,
) {
  return getVoiceSourceLocale(category, bundleId, language) !== null;
}

/** Source locale differs from spoken language only when explicitly configured. */
export function getVoiceSourceLocale(
  category: VoiceCategory | "battle",
  bundleId: string,
  language: VoiceLanguage,
): VoiceLanguage | null {
  const bundleBaseName = bundleId.replace(/\.(?:vkor|vjpn)$/i, "").toLowerCase();
  const exception = voiceLanguageExceptions.find(
    (entry) => entry.category === category && entry.bundleId === bundleBaseName,
  );
  if (exception && !exception.languages.includes(language)) return null;
  return exception?.sourceLocales?.[language] ?? language;
}

export function getVoiceFilePath(
  category: string,
  bundleDirectory: string,
  fileName: string,
) {
  if (
    !isVoiceCategory(category) ||
    path.basename(bundleDirectory) !== bundleDirectory ||
    path.basename(fileName) !== fileName ||
    !/^[A-Za-z0-9_]+\.(?:vkor|vjpn)$/i.test(bundleDirectory) ||
    // STV-AUD-004: character/operator playback uses the Opus web derivative.
    // Client WAV files remain preserved outside this URL resolver.
    !/^[A-Za-z0-9_-]+\.ogg$/i.test(fileName)
  ) {
    return null;
  }

  const voiceDirectory = category === "unit" ? "unit_voice" : "operator_voice";
  const filePath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "sound",
    "voice",
    voiceDirectory,
    bundleDirectory,
    fileName,
  );

  if (
    !operatorVoicePaths.has(`${voiceDirectory}/${bundleDirectory}/${fileName}`) && !(category === "unit" && voicePaths.has(`${voiceDirectory}/${bundleDirectory}/${fileName}`)) && (!fs.existsSync(/* turbopackIgnore: true */ filePath) ||
    !fs.statSync(/* turbopackIgnore: true */ filePath).isFile())
  ) {
    return null;
  }

  return filePath;
}

export function createVoiceAudioPath(
  category: VoiceCategory,
  bundleId: string,
  soundId: string,
  language: VoiceLanguage = "ko",
) {
  if (!bundleId || !soundId) {
    return "";
  }

  const bundleBaseName = bundleId.replace(/\.(?:vkor|vjpn)$/i, "").toLowerCase();
  const sourceLocale = getVoiceSourceLocale(category, bundleBaseName, language);
  if (sourceLocale === null) {
    return "";
  }

  const suffix = sourceLocale === "ja" ? "vjpn" : "vkor";
  const bundleDirectory = `${bundleBaseName}.${suffix}`;
  const fileName = `${soundId}.ogg`;

  if (!getVoiceFilePath(category, bundleDirectory, fileName)) {
    return "";
  }

  const voiceDirectory = category === "unit" ? "unit_voice" : "operator_voice";

  if (category === "operator") {
    const relative = `${voiceDirectory}/${bundleDirectory}/${fileName}`;
    return `${operatorCatalog.baseUrl}/${relative.split("/").map(encodeURIComponent).join("/")}`;
  }

  if (category === "unit" && /^ab_ui_(?:unit|skin)_voice_/.test(bundleDirectory)) {
    return `${CHARACTER_VOICE_BASE_URL}/${encodeURIComponent(bundleDirectory)}/${encodeURIComponent(fileName)}`;
  }

  return createSoundAssetUrl(
    "voice",
    voiceDirectory,
    bundleDirectory,
    fileName,
  );
}
