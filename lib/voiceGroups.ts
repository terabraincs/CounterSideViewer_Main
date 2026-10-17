export type VoiceGroup = {
    id: string;
    label: string;
    clips: {
        id: string;
        bundle: string;
        audioPath: string;
        japaneseAudioPath: string;
    }[];
};
