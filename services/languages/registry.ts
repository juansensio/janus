export type LanguageCode = string;

export type LanguageDefinition = {
    code: LanguageCode;
    nativeName: string;
};

const REGISTRY: readonly LanguageDefinition[] = [
    { code: "en", nativeName: "English" },
    { code: "es", nativeName: "Español" },
];

export function registeredLanguages(): readonly LanguageDefinition[] {
    return REGISTRY;
}

export function supportedLanguages(): LanguageCode[] {
    return REGISTRY.map((entry) => entry.code);
}
