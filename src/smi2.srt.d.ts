declare module "smi2srt";
declare module "smi2srt" {
  export function smi2srt(smiFile: string): Promise<string>;
}
