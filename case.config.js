// Replace the four questions, accepted answers and story here.
// Static/offline games cannot keep answers secret from someone inspecting the source.
export const CASE_CONFIG = {
  revision: "placeholder-1",
  clues: [
    {
      title: "Startnummeret",
      question: "Hvilket startnummer hadde deltakeren som forsvant?",
      answers: ["13", "013", "tretten", "nummer 13"],
      maxTypos: 0,
      success: "Startnummer identifisert. Deltaker 013.",
    },
    {
      title: "Åstedet",
      question: "Hvor ble deltakeren sist sett?",
      answers: ["broen", "brua", "broa", "på broen", "på brua"],
      maxTypos: 1,
      success: "Åsted bekreftet. Søk i broarkivet aktivert.",
    },
    {
      title: "Gjenstanden",
      question: "Hva lå igjen ved den siste posten?",
      answers: ["en nøkkel", "nøkkel", "nøkkelen"],
      maxTypos: 1,
      success: "Gjenstand registrert. Nøkkelen passer til arkivet.",
    },
    {
      title: "Beskjeden",
      question: "Hvilket ord var risset inn i treet?",
      answers: ["vent", "vente"],
      maxTypos: 1,
      success: "Beskjed tydet. Noen har ventet lenge.",
    },
  ],
  decryption: [
    { at: 0, progress: 8, message: "Kontrollerer bevismateriale …", log: "> FIRE SPOR MOTTATT", tone: 110 },
    { at: 2400, progress: 27, message: "Henter vitneforklaringer fra 2001 …", log: "> ARKIV 2001 / TILGANG GJENOPPRETTET", tone: 130 },
    { at: 5000, progress: 49, message: "Én deltaker mangler i resultatlisten.", log: "> DELTAKER 013 / INGEN MÅLPASSERING", tone: 98 },
    { at: 7800, progress: 71, message: "Saken ble aldri avsluttet.", log: "> ADVARSEL: NY AKTIVITET I LØYPA", tone: 82 },
    { at: 10600, progress: 91, message: "Noen har ventet på at dere skulle komme tilbake.", log: "> POSISJON: NÆRMERE ENN DERE TROR", tone: 65 },
    { at: 13400, progress: 100, message: "Sluttrapport dekryptert.", log: "> SAK 013 / IKKE LENGER LUKKET", tone: 55 },
  ],
  decryptionDuration: 15500,
  revelation: {
    title: "Han forlot aldri løypa.",
    paragraphs: [
      "31. oktober 2001. Da de andre løperne kom i mål, var nummer 13 borte. Ved broen fant de bare startnummeret hans og en gammel nøkkel.",
      "Politiet lette i tre døgn. Så ble søket stanset. Det siste vitnet hadde hørt skritt bak seg, selv om ingen andre var på broen.",
      "I 23 år lå nøkkelen urørt i arkivet. Men da Broløpet startet igjen, var den borte. På innsiden av den låste skuffen sto ett ord: VENT.",
      "Dere trodde dere fulgte sporene hans. Men det var han som fulgte dere. Hele veien tilbake.",
    ],
    characterDelay: 29,
    paragraphPause: 2100,
    finalHold: 6500,
    warning: "Hører dere også skrittene?",
    warningDuration: 4500,
  },
};
