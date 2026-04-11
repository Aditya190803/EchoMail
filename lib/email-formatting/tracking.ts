import { generateLinkId, generateRecipientId } from "../analytics";
import { emailLogger } from "../logger";

export function injectTracking(
  html: string,
  params: {
    campaignId: string;
    recipientEmail: string;
    userEmail: string;
    isTransactional?: boolean;
    trackingEnabled?: boolean;
  },
  baseUrl: string,
): string {
  if (!html) {
    return "";
  }

  const {
    campaignId,
    recipientEmail,
    userEmail,
    isTransactional,
    trackingEnabled = true,
  } = params;

  const encodedRecipient = encodeURIComponent(recipientEmail || "");
  const encodedUser = encodeURIComponent(userEmail || "");
  const recipientId = generateRecipientId(recipientEmail);

  emailLogger.info("Injecting tracking into email", {
    campaignId,
    recipientEmail,
    userEmail,
    trackingEnabled,
    baseUrl,
  });

  let result = html;

  if (trackingEnabled) {
    const openTrackUrl = `${baseUrl}/api/track/open?c=${campaignId}&e=${encodedRecipient}&u=${encodedUser}&r=${recipientId}`;
    emailLogger.debug("Open tracking URL", { openTrackUrl });
    const pixelTag = `<img src="${openTrackUrl}" width="1" height="1" alt="" style="border:0;width:1px;height:1px;" />`;

    if (result.includes("</body>")) {
      result = result.replace("</body>", `${pixelTag}</body>`);
    } else {
      result = `${result}${pixelTag}`;
    }
  }

  if (trackingEnabled) {
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]+)"([^>]*?)>/gi;

    result = result.replace(linkRegex, (match, url, rest) => {
      if (!url.startsWith("http")) {
        return match;
      }

      if (
        url.includes("/api/track/click") ||
        url.includes("/api/unsubscribe")
      ) {
        return match;
      }

      const linkIdMatch = rest.match(/data-link-id="([^"]+)"/);
      const linkId = linkIdMatch ? linkIdMatch[1] : generateLinkId();

      const encodedUrl = encodeURIComponent(url);
      const clickTrackUrl = `${baseUrl}/api/track/click?url=${encodedUrl}&c=${campaignId}&e=${encodedRecipient}&u=${encodedUser}&r=${recipientId}&l=${linkId}`;

      const cleanedRest = rest.replace(/data-link-id="[^"]*"/, "");

      return `<a href="${clickTrackUrl}"${cleanedRest}>`;
    });
  }

  if (!isTransactional && !result.toLowerCase().includes("unsubscribe")) {
    const unsubscribeUrl = `${baseUrl}/api/unsubscribe?e=${encodedRecipient}&u=${encodedUser}`;
    const unsubscribeTag = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eeeeee; text-align: center; font-size: 12px; color: #999999;">
        <p>You are receiving this email because you are on our mailing list.</p>
        <p><a href="${unsubscribeUrl}" style="color: #999999; text-decoration: underline;">Unsubscribe</a> from this list.</p>
      </div>
    `;

    if (result.includes("</body>")) {
      result = result.replace("</body>", `${unsubscribeTag}</body>`);
    } else {
      result = `${result}${unsubscribeTag}`;
    }
  }

  return result;
}
