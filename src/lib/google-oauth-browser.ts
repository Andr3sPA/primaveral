const inAppBrowserPattern =
  /(?:FBAN|FBAV|FB_IAB|FB4A|Instagram|Line\/|TikTok|Twitter|Snapchat|LinkedInApp|Pinterest|WhatsApp|MicroMessenger|\bwv\b)/i;
const iosBrowserPattern = /(?:Safari|CriOS|FxiOS|EdgiOS|OPiOS)/i;

export function isGoogleOAuthInAppBrowser(userAgent: string) {
  if (inAppBrowserPattern.test(userAgent)) return true;

  return (
    (/(?:iPhone|iPad|iPod)/i.test(userAgent) ||
      (/Macintosh/i.test(userAgent) && /Mobile\//i.test(userAgent))) &&
    /AppleWebKit/i.test(userAgent) &&
    !iosBrowserPattern.test(userAgent)
  );
}
