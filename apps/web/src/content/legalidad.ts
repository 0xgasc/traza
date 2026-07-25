export type LegalCountry = "guatemala" | "mexico" | "colombia";

export const LEGAL_COUNTRIES: LegalCountry[] = ["guatemala", "mexico", "colombia"];

interface CountrySection {
  heading: string;
  paragraphs: string[];
}

export interface CountryContent {
  name: string;
  flag: string;
  law: string;
  lawSummary: string;
  sections: CountrySection[];
  evidenceHeading: string;
  evidence: string[];
  limitsHeading: string;
  limits: string[];
}

export interface LegalidadContent {
  title: string;
  intro: string[];
  stackHeading: string;
  stack: { name: string; desc: string }[];
  countriesHeading: string;
  disclaimer: string;
  backLabel: string;
  countries: Record<LegalCountry, CountryContent>;
}

const en: LegalidadContent = {
  title: "Is an electronic signature legally valid?",
  intro: [
    "Short answer: yes — in Guatemala, Mexico and Colombia, electronic signatures have been legally recognized for over a decade for the vast majority of private and commercial contracts.",
    "Traza provides what these laws call a simple (ordinary) electronic signature, reinforced with a cryptographic evidence stack: document hashing, a complete audit trail, signer verification and optional blockchain anchoring. Traza is not a government-accredited certification provider, and we say so plainly — for the small set of acts that require an advanced/certified signature or a notary, we tell you below.",
    "In a dispute, what matters is evidence: proving who signed, what they signed, and that the document hasn't changed since. That is exactly what Traza is built to produce.",
  ],
  stackHeading: "The evidence Traza produces on every document",
  stack: [
    { name: "SHA-256 hash at upload", desc: "A cryptographic fingerprint proves the document hasn't been altered since signing — changing one comma changes the hash." },
    { name: "Complete audit trail", desc: "Every view, signature and download logged with IP address, timestamp and device — evidence of attribution and consent." },
    { name: "Signer verification", desc: "Secure unique signing links, with optional one-time codes (OTP) at the moment of signature." },
    { name: "Blockchain anchoring (optional)", desc: "The document hash anchored on Polygon: independent, immutable proof that the document existed at a point in time." },
    { name: "Verifiable proof bundle", desc: "Signed documents ship with a proof package anyone can verify on our public verification page — no Traza account needed." },
  ],
  countriesHeading: "Country by country",
  disclaimer: "This guide is general information, not legal advice. For high-stakes contracts, consult a lawyer in the relevant jurisdiction.",
  backLabel: "All countries",
  countries: {
    guatemala: {
      name: "Guatemala",
      flag: "🇬🇹",
      law: "Decreto 47-2008 — Ley para el Reconocimiento de las Comunicaciones y Firmas Electrónicas",
      lawSummary:
        "Since 2008, Guatemalan law recognizes electronic communications and signatures as legally valid and admissible as evidence, under the principles of functional equivalence and technological neutrality.",
      sections: [
        {
          heading: "What the law says",
          paragraphs: [
            "Decreto 47-2008 establishes that a communication or contract cannot be denied legal effect solely because it is in electronic form. An electronic signature is valid when the method used identifies the signer and indicates their approval of the content, and is as reliable as appropriate for the purpose of the message.",
            "The law distinguishes between the electronic signature (any reliable method — what Traza provides) and the advanced electronic signature, which requires a certificate issued by a certification service provider registered with the Registro de Prestadores de Servicios de Certificación. The advanced signature enjoys a stronger legal presumption, but the ordinary electronic signature is fully valid — the difference is who carries the burden of proving reliability, which is where Traza's evidence stack does the work.",
          ],
        },
      ],
      evidenceHeading: "How Traza maps to Decreto 47-2008",
      evidence: [
        "Identification of the signer → unique signing link to a verified email, optional OTP, IP and device logging.",
        "Approval of the content → explicit signature action recorded with timestamp, on an exact document version identified by its SHA-256 hash.",
        "Reliability of the method → tamper-evident hashing, immutable audit log, optional blockchain anchor as independent timestamp.",
        "Admissibility → the proof bundle gives a court everything needed to evaluate the signature as evidence.",
      ],
      limitsHeading: "When you need more than Traza",
      limits: [
        "Acts that require escritura pública before a notary (real estate transfers, company incorporation, marriage/family acts, wills).",
        "Procedures where a government agency specifically demands an advanced electronic signature from a registered provider.",
        "Documents for SAT (e.g. FEL invoicing) follow their own certified regime — separate from contract signing.",
      ],
    },
    mexico: {
      name: "Mexico",
      flag: "🇲🇽",
      law: "Código de Comercio (arts. 89–114) · NOM-151-SCFI-2016",
      lawSummary:
        "Mexican commercial law has recognized data messages and electronic signatures since 2003. For most commercial contracts between private parties, a simple electronic signature is valid and enforceable.",
      sections: [
        {
          heading: "What the law says",
          paragraphs: [
            "The Código de Comercio recognizes the firma electrónica: electronic data attached to a data message used to identify the signer and indicate approval. It cannot be denied effect merely for being electronic. A firma electrónica avanzada or fiable enjoys stronger presumptions when specific reliability requirements are met (signature creation data under the signer's exclusive control, detectability of alterations).",
            "NOM-151-SCFI-2016 governs the preservation of data messages and the issuance of conservation certificates (constancias) by providers certified by the Secretaría de Economía. Traza is not a NOM-151 certified provider — our optional Polygon anchoring is complementary timestamp evidence proving document existence and integrity, not an official constancia. For regulated flows that specifically require NOM-151 constancias or the SAT's e.firma, those certified instruments are the right tool; for everyday commercial contracts, Traza's evidence stack is designed to satisfy the Código de Comercio's reliability standard.",
          ],
        },
      ],
      evidenceHeading: "How Traza maps to the Código de Comercio",
      evidence: [
        "Identification of the signer → unique signing links, optional OTP at signature, full session metadata.",
        "Approval of content → signature event bound to the exact document version via SHA-256 hash.",
        "Integrity of the data message → any alteration after signing is detectable by hash comparison, verifiable publicly.",
        "Timestamp evidence → audit trail plus optional blockchain anchor (independent of Traza's servers).",
      ],
      limitsHeading: "When you need more than Traza",
      limits: [
        "Acts requiring a notario público or corredor (real estate, corporate formation, powers of attorney).",
        "Tax and government filings requiring SAT's e.firma (FIEL).",
        "Regulated processes that explicitly demand a NOM-151 constancia or firma electrónica avanzada from a certified provider.",
      ],
    },
    colombia: {
      name: "Colombia",
      flag: "🇨🇴",
      law: "Ley 527 de 1999 · Decreto 2364 de 2012",
      lawSummary:
        "Colombia was an early adopter: Ley 527 de 1999 recognizes data messages and signatures, and Decreto 2364 de 2012 explicitly regulates the electronic signature as valid when reliable and appropriate for its purpose.",
      sections: [
        {
          heading: "What the law says",
          paragraphs: [
            "Ley 527 establishes functional equivalence: data messages have the same legal effect as written documents, and are admissible as evidence. It defines the firma digital (certificate-based, via certification entities supervised by ONAC) with a special presumption of authenticity.",
            "Decreto 2364 de 2012 regulates the broader firma electrónica: codes, passwords, biometric data or private keys that identify a person in relation to a data message. It is valid when the method is as reliable as appropriate for the purpose — and crucially, reliability can be agreed between the parties. Including an e-signature clause in your contracts (Traza's templates do) makes the parties' acceptance of the method explicit.",
          ],
        },
      ],
      evidenceHeading: "How Traza maps to Ley 527 / Decreto 2364",
      evidence: [
        "Identification → unique signing link, optional OTP, IP/device metadata tied to each signature.",
        "Reliability of the method → cryptographic hashing, immutable audit log, optional blockchain anchoring.",
        "Integrity → SHA-256 comparison detects any post-signature alteration, verifiable by anyone.",
        "Party agreement → signature workflows record explicit consent to sign electronically.",
      ],
      limitsHeading: "When you need more than Traza",
      limits: [
        "Acts requiring escritura pública (real estate transfers, some corporate and family acts).",
        "Procedures where regulation demands a firma digital certificada from an ONAC-accredited certification entity.",
      ],
    },
  },
};

const es: LegalidadContent = {
  title: "¿Es legalmente válida una firma electrónica?",
  intro: [
    "Respuesta corta: sí — en Guatemala, México y Colombia la firma electrónica tiene reconocimiento legal desde hace más de una década para la gran mayoría de contratos privados y mercantiles.",
    "Traza provee lo que estas leyes llaman una firma electrónica simple (ordinaria), reforzada con una pila de evidencia criptográfica: hash del documento, registro de auditoría completo, verificación del firmante y anclaje opcional en blockchain. Traza no es un prestador de servicios de certificación acreditado por el Estado, y lo decimos con claridad — para el pequeño conjunto de actos que exigen firma avanzada/certificada o notario, te lo indicamos abajo.",
    "En una disputa, lo que importa es la evidencia: probar quién firmó, qué firmó, y que el documento no ha cambiado desde entonces. Eso es exactamente lo que Traza está construido para producir.",
  ],
  stackHeading: "La evidencia que Traza produce en cada documento",
  stack: [
    { name: "Hash SHA-256 al subir", desc: "Una huella criptográfica prueba que el documento no fue alterado después de firmarse — cambiar una coma cambia el hash." },
    { name: "Registro de auditoría completo", desc: "Cada vista, firma y descarga queda registrada con dirección IP, fecha/hora y dispositivo — evidencia de atribución y consentimiento." },
    { name: "Verificación del firmante", desc: "Enlaces de firma únicos y seguros, con códigos de un solo uso (OTP) opcionales al momento de firmar." },
    { name: "Anclaje en blockchain (opcional)", desc: "El hash del documento anclado en Polygon: prueba independiente e inmutable de que el documento existía en un momento dado." },
    { name: "Paquete de prueba verificable", desc: "Los documentos firmados incluyen un paquete de prueba que cualquiera puede verificar en nuestra página pública — sin cuenta de Traza." },
  ],
  countriesHeading: "País por país",
  disclaimer: "Esta guía es información general, no asesoría legal. Para contratos de alto riesgo, consulta a un abogado de la jurisdicción correspondiente.",
  backLabel: "Todos los países",
  countries: {
    guatemala: {
      name: "Guatemala",
      flag: "🇬🇹",
      law: "Decreto 47-2008 — Ley para el Reconocimiento de las Comunicaciones y Firmas Electrónicas",
      lawSummary:
        "Desde 2008, la ley guatemalteca reconoce las comunicaciones y firmas electrónicas como legalmente válidas y admisibles como prueba, bajo los principios de equivalencia funcional y neutralidad tecnológica.",
      sections: [
        {
          heading: "Qué dice la ley",
          paragraphs: [
            "El Decreto 47-2008 establece que no se puede negar efecto legal a una comunicación o contrato por el solo hecho de estar en forma electrónica. Una firma electrónica es válida cuando el método utilizado identifica al firmante, indica su aprobación del contenido, y es tan confiable como resulte apropiado para el propósito del mensaje.",
            "La ley distingue entre la firma electrónica (cualquier método confiable — lo que provee Traza) y la firma electrónica avanzada, que requiere un certificado emitido por un prestador registrado en el Registro de Prestadores de Servicios de Certificación. La firma avanzada goza de una presunción legal más fuerte, pero la firma electrónica ordinaria es plenamente válida — la diferencia está en quién carga con la prueba de confiabilidad, y ahí es donde trabaja la pila de evidencia de Traza.",
          ],
        },
      ],
      evidenceHeading: "Cómo Traza responde al Decreto 47-2008",
      evidence: [
        "Identificación del firmante → enlace único a un correo verificado, OTP opcional, registro de IP y dispositivo.",
        "Aprobación del contenido → acción de firma explícita registrada con fecha/hora, sobre una versión exacta del documento identificada por su hash SHA-256.",
        "Confiabilidad del método → hash a prueba de manipulación, bitácora de auditoría inmutable, ancla opcional en blockchain como sello de tiempo independiente.",
        "Admisibilidad → el paquete de prueba le da a un juez todo lo necesario para valorar la firma como evidencia.",
      ],
      limitsHeading: "Cuándo necesitas más que Traza",
      limits: [
        "Actos que requieren escritura pública ante notario (traslado de inmuebles, constitución de sociedades, actos de familia, testamentos).",
        "Trámites donde una entidad estatal exige específicamente firma electrónica avanzada de un prestador registrado.",
        "Documentos para SAT (p. ej. facturación FEL) siguen su propio régimen certificado — separado de la firma de contratos.",
      ],
    },
    mexico: {
      name: "México",
      flag: "🇲🇽",
      law: "Código de Comercio (arts. 89–114) · NOM-151-SCFI-2016",
      lawSummary:
        "El derecho mercantil mexicano reconoce los mensajes de datos y la firma electrónica desde 2003. Para la mayoría de contratos mercantiles entre particulares, la firma electrónica simple es válida y exigible.",
      sections: [
        {
          heading: "Qué dice la ley",
          paragraphs: [
            "El Código de Comercio reconoce la firma electrónica: datos electrónicos consignados o adjuntos a un mensaje de datos, utilizados para identificar al firmante e indicar su aprobación. No se le pueden negar efectos jurídicos por ser electrónica. La firma electrónica avanzada o fiable goza de presunciones más fuertes cuando se cumplen requisitos de confiabilidad (datos de creación bajo control exclusivo del firmante, detectabilidad de alteraciones).",
            "La NOM-151-SCFI-2016 regula la conservación de mensajes de datos y la emisión de constancias de conservación por prestadores certificados por la Secretaría de Economía. Traza no es un prestador certificado NOM-151 — nuestro anclaje opcional en Polygon es evidencia complementaria de sello de tiempo que prueba existencia e integridad del documento, no una constancia oficial. Para flujos regulados que exigen específicamente constancias NOM-151 o la e.firma del SAT, esos instrumentos certificados son la herramienta correcta; para contratos mercantiles del día a día, la pila de evidencia de Traza está diseñada para satisfacer el estándar de confiabilidad del Código de Comercio.",
          ],
        },
      ],
      evidenceHeading: "Cómo Traza responde al Código de Comercio",
      evidence: [
        "Identificación del firmante → enlaces de firma únicos, OTP opcional al firmar, metadatos completos de sesión.",
        "Aprobación del contenido → evento de firma vinculado a la versión exacta del documento vía hash SHA-256.",
        "Integridad del mensaje de datos → cualquier alteración posterior a la firma es detectable por comparación de hash, verificable públicamente.",
        "Evidencia de fecha cierta → bitácora de auditoría más ancla opcional en blockchain (independiente de los servidores de Traza).",
      ],
      limitsHeading: "Cuándo necesitas más que Traza",
      limits: [
        "Actos que requieren notario público o corredor (inmuebles, constitución de sociedades, poderes).",
        "Trámites fiscales y gubernamentales que requieren la e.firma (FIEL) del SAT.",
        "Procesos regulados que exigen explícitamente constancia NOM-151 o firma electrónica avanzada de un prestador certificado.",
      ],
    },
    colombia: {
      name: "Colombia",
      flag: "🇨🇴",
      law: "Ley 527 de 1999 · Decreto 2364 de 2012",
      lawSummary:
        "Colombia fue pionera: la Ley 527 de 1999 reconoce los mensajes de datos y las firmas, y el Decreto 2364 de 2012 regula expresamente la firma electrónica como válida cuando es confiable y apropiada para su propósito.",
      sections: [
        {
          heading: "Qué dice la ley",
          paragraphs: [
            "La Ley 527 establece la equivalencia funcional: los mensajes de datos tienen el mismo efecto jurídico que los documentos escritos y son admisibles como prueba. Define la firma digital (basada en certificados, vía entidades de certificación vigiladas por la ONAC) con una presunción especial de autenticidad.",
            "El Decreto 2364 de 2012 regula la firma electrónica en sentido amplio: códigos, contraseñas, datos biométricos o claves privadas que identifican a una persona respecto de un mensaje de datos. Es válida cuando el método es tan confiable como apropiado para el fin — y, clave, la confiabilidad puede pactarse entre las partes. Incluir una cláusula de firma electrónica en tus contratos (las plantillas de Traza la incluyen) hace explícita la aceptación del método por las partes.",
          ],
        },
      ],
      evidenceHeading: "Cómo Traza responde a la Ley 527 / Decreto 2364",
      evidence: [
        "Identificación → enlace de firma único, OTP opcional, metadatos de IP/dispositivo ligados a cada firma.",
        "Confiabilidad del método → hash criptográfico, bitácora inmutable, anclaje opcional en blockchain.",
        "Integridad → la comparación SHA-256 detecta cualquier alteración posterior a la firma, verificable por cualquiera.",
        "Acuerdo entre partes → los flujos de firma registran el consentimiento explícito a firmar electrónicamente.",
      ],
      limitsHeading: "Cuándo necesitas más que Traza",
      limits: [
        "Actos que requieren escritura pública (traslado de inmuebles, algunos actos societarios y de familia).",
        "Trámites donde la regulación exige firma digital certificada de una entidad acreditada ante la ONAC.",
      ],
    },
  },
};

export function getLegalidadContent(locale: string): LegalidadContent {
  return locale === "es" ? es : en;
}
