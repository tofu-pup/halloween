// Questions, accepted answers and the staged police-file reveal.
// Static/offline games cannot keep answers secret from someone inspecting the source.
export const CASE_CONFIG = {
  revision: "brolopet-2026-2",
  clues: [
    {
      title: "Deltakeren",
      question: "Hva het deltakeren som forsvant under Broløpet i 2001?",
      answers: ["Ole Vik"],
      maxTypos: 0,
      success: "Opplysning bekreftet.",
    },
    {
      title: "Tidspunktet",
      question: "Hva var klokka da gutten banket på døren?",
      answers: ["18.42", "18:42", "1842"],
      format: "time",
      maxTypos: 0,
      success: "Opplysning bekreftet.",
    },
    {
      title: "Observasjonen",
      question: "Hvilken øy ble deltakeren sist observert på?",
      answers: ["Føynland", "Foynland"],
      maxTypos: 0,
      success: "Opplysning bekreftet.",
    },
    {
      title: "Beskjeden",
      question: "Hva forsøker den hemmelige beskjeden å advare dere mot?",
      answers: ["IKKE SNU DEG"],
      maxTypos: 0,
      success: "Opplysning bekreftet.",
    },
  ],
  decryption: [
    { at: 0, progress: 8, message: "ALLE FIRE SPOR BEKREFTET", log: "> FIRE SPOR MOTTATT", tone: 110 },
    { at: 2400, progress: 27, message: "Henter vitneforklaringer fra 2001 …", log: "> ARKIV 2001 / TILGANG GJENOPPRETTET", tone: 130 },
    { at: 5000, progress: 49, message: "Én deltaker mangler i resultatlisten.", log: "> DELTAKER 013 / INGEN MÅLPASSERING", tone: 98 },
    { at: 7800, progress: 71, message: "Etterforskningen gjenåpnet. Oktober 2026.", log: "> NYE OPPLYSNINGER / 2026", tone: 82 },
    { at: 10600, progress: 91, message: "Kobler sammen opplysningene …", log: "> IDENTITETSKONTROLL PÅGÅR", tone: 65 },
    { at: 13400, progress: 100, message: "Sluttrapport dekryptert.", log: "> SAK 013 / IKKE LENGER LUKKET", tone: 55 },
  ],
  decryptionDuration: 15500,
  revelation: {
    title: "SAVNET PERSON",
    fields: [
      { label: "Navn", value: "OLE VIK" },
      { label: "Startnummer", value: "13" },
      { label: "Sist sett", value: "31.10.2001" },
      { label: "Status", value: "FORSVUNNET" },
    ],
    connection: ["NYE OPPLYSNINGER – 2026", "OLE VIK", "NY IDENTITET FUNNET"],
    characterDelay: 45,
    paragraphPause: 1000,
    finalHold: 4000,
    warning: "KOBLING BEKREFTET",
    warningDuration: 2500,
    identityDelay: 2500,
    identity: "Ole Vik = OLE MAGNUS SVANVIK",
  },
};
