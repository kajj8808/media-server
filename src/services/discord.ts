import { EmbedBuilder, WebhookClient, type ColorResolvable } from "discord.js";
import { Vibrant } from "node-vibrant/node";

const webhookClient = new WebhookClient({
  url: "https://discord.com/api/webhooks/869305319384293456/iCxdyMvKJl4-7kKf6Kybjd63JC1O3ENuQCnhTluWCShf2OlpAWwbSsT680LObMD6huV-",
});

interface SnedMessageAnimationProps {
  seriesName: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
  imageUrl: string;
}

export async function sendAnimationMessage(props: SnedMessageAnimationProps) {
  const { seriesName, seasonNumber, episodeNumber, episodeName, imageUrl } =
    props;

  const result = await Vibrant.from(imageUrl).getPalette();

  const embed = new EmbedBuilder()
    .setDescription(
      `-# ${seriesName}  \n### [${seasonNumber} ${episodeNumber} ${episodeName}](https://www.youtube.com/watch?v=lTNsFt31u30)\n`
    )
    .setImage(imageUrl)
    .setColor((result.Vibrant?.hex as ColorResolvable) ?? "Blue")
    .setTimestamp();

  webhookClient.send({
    embeds: [embed],
  });
}
{
}
