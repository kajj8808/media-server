declare module "smi2srt" {
  function smi2srt(smiFile: string): Promise<string>;
  export = smi2srt;
}
