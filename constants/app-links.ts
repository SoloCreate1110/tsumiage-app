export interface SnsLink {
  id: string;
  label: string;
  url: string;
}

export const SNS_LINKS: SnsLink[] = [
  {
    id: "x-create-solo",
    label: "作者X",
    url: "https://x.com/CreateSolo",
  },
];

export const CONTACT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSez5mCaWZsiSc006Lbvd5qnU_WyhjBaMx9-4Sb3ipctmWFw3g/viewform?usp=header";

export const APP_UPDATE_CONFIG_URL =
  "https://solocreate1110.github.io/solocreate-app-updates/tsumiage/version.json";
