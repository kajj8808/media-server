import {
  Client,
  ColorResolvable,
  EmbedBuilder,
  WebhookClient,
} from "discord.js";
import { getProminentColorHexCode } from "./utile";

// 서버가 늘어날 경우 수정
const discordWebhookClient = new WebhookClient({
  url: process.env.DISCORD_CHANNEL_URL || "",
});

interface MessageData {
  thumnail: string;
  title: string;
  url: string;
}
export async function uploadMessageToDiscordChannel({
  title,
  thumnail,
  url,
}: MessageData) {
  const prominetHexCode = (await getProminentColorHexCode(
    thumnail
  )) as ColorResolvable;
  const uploadMessageEmbed = new EmbedBuilder()
    .setTitle(title)
    .setColor(prominetHexCode)
    .setImage(thumnail)
    .setURL(url)
    .setTimestamp();

  discordWebhookClient.send({
    embeds: [uploadMessageEmbed],
  });
}
