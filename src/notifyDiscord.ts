import appSettings from './appSettings';

export async function notifyDiscord(message: string): Promise<void> {
  if (!appSettings.discordWebhookUrl) {
    return;
  }

  const prefix = `[🌐 ${appSettings.network.name}]${appSettings.dryRun ? ' [🌵 DRY RUN]' : ''} `;

  try {
    const response = await fetch(appSettings.discordWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({content: prefix + message}),
    });

    if (!response.ok) {
      console.error(
        `Failed to send Discord notification: ${response.status} ${response.statusText}`,
        await response.text(),
      );
    }
  } catch (error) {
    console.error(
      'Error sending Discord notification:',
      error instanceof Error ? error.message : error,
    );
  }
}
