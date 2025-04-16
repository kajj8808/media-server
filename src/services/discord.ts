import { EmbedBuilder, WebhookClient, type ColorResolvable } from "discord.js";
import { Vibrant } from "node-vibrant/node";

const webhookClient = new WebhookClient({
  url: process.env.DISCORD_CHANNEL_URL ?? "",
});

interface SnedMessageAnimationProps {
  seriesName: string;
  seasonName: string;
  episodeNumber: number;
  episodeName: string;
  imageUrl: string;
  watchId: string;
}

export async function sendAnimationMessage(props: SnedMessageAnimationProps) {
  const {
    seriesName,
    seasonName,
    episodeNumber,
    episodeName,
    imageUrl,
    watchId,
  } = props;

  const result = await Vibrant.from(imageUrl).getPalette();

  const embed = new EmbedBuilder()
    .setDescription(
      `-# ${seriesName}  \n### [${seasonName} ${episodeNumber}화 ${episodeName}](${process.env.FRONT_URL}/watch/${watchId})\n`
    )
    .setImage(imageUrl)
    .setColor((result.DarkMuted?.hex as ColorResolvable) ?? "Blue")
    .setTimestamp();

  webhookClient.send({
    embeds: [embed],
  });
}
