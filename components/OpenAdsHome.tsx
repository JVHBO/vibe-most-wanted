const PUBLISHER = "0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52";
const APP_ID = "c28f0313-c888-4d31-a8cc-c59fe2666177";
const PARENT_URL = "https%3A%2F%2Fvibemostwanted.xyz";

const serveUrl = (placement: string, position: string) => (
  `https://api.openads.world/serve?publisher=${PUBLISHER}&placement=${placement}-${PUBLISHER}&position=${position}&parent_url=${PARENT_URL}&app_id=${APP_ID}`
);

export function OpenAdsHome() {
  return (
    <div className="openads-home" aria-hidden="true">
      <link rel="stylesheet" href={`https://api.openads.world/api/v1/serve/dynamic-css?publisher=${PUBLISHER}`} />
      <iframe className="openads-popup" src={serveUrl("300x250", "popup")} title="Advertisement" width="300" height="250" style={{ border: "none" }} frameBorder="0" scrolling="no" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write" />
      <iframe className="openads-floating" src={serveUrl("64x64", "floating")} title="Advertisement" width="64" height="64" style={{ position: "fixed", right: "12px", bottom: "72px", width: "64px", height: "64px", border: "none", borderRadius: "50%", zIndex: 40 }} frameBorder="0" scrolling="no" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write" />
      <iframe className="openads-top-banner" src={serveUrl("320x50_top", "top")} title="Advertisement" width="320" height="50" style={{ border: "none" }} frameBorder="0" scrolling="no" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write" />
      <iframe className="openads-banner" src={serveUrl("320x50", "bottom")} title="Advertisement" width="320" height="50" style={{ border: "none" }} frameBorder="0" scrolling="no" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="clipboard-write" />
      <style>{`
        .openads-home .openads-popup,
        .openads-home .openads-floating,
        .openads-home .openads-top-banner,
        .openads-home .openads-banner {
          z-index: 40 !important;
        }

        @media (max-width: 768px) {
          .openads-home .openads-popup,
          .openads-home .openads-top-banner,
          .openads-home .openads-banner {
            display: none !important;
            pointer-events: none !important;
          }

          .openads-home .openads-floating {
            display: block !important;
            position: fixed !important;
            top: auto !important;
            right: 8px !important;
            bottom: 72px !important;
            width: 48px !important;
            height: 48px !important;
            max-width: 48px !important;
            max-height: 48px !important;
            pointer-events: none !important;
            z-index: 40 !important;
          }
        }
      `}</style>
    </div>
  );
}
