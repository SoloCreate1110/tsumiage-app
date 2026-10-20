export type ExternalLink = {
  id: string;
  label: string;
  url: string;
};

// TODO: Set your SNS links here.
export const SNS_LINKS: ExternalLink[] = [
  { id: "x", label: "X (Twitter)", url: "https://x.com/CreateSolo" },
];

// TODO: Set your Google Form URL here.
export const CONTACT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSez5mCaWZsiSc006Lbvd5qnU_WyhjBaMx9-4Sb3ipctmWFw3g/viewform?usp=publish-editor";
