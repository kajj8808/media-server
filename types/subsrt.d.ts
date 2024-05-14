type FormatType = "smi" | "ass" | "vtt" | "srt";
declare module "subsrt" {
  export function convert(
    subtitleString: string,
    { format }: { format: FormatType }
  ): string;
}
