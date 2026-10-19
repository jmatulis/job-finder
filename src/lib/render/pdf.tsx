import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Resume } from "../resume";

// Single-column, text-only layout so applicant tracking systems parse it cleanly.
const s = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.35, color: "#111" },
  name: { fontSize: 20, lineHeight: 1.2, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  contact: { fontSize: 9, color: "#444", marginBottom: 10 },
  heading: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    borderBottomWidth: 0.75,
    borderBottomColor: "#999",
    paddingBottom: 2,
    marginTop: 10,
    marginBottom: 5,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#555" },
  job: { marginBottom: 7 },
  bullet: { flexDirection: "row", marginTop: 1.5 },
  dot: { width: 10 },
  bulletText: { flex: 1 },
});

function ResumeDoc({ r }: { r: Resume }) {
  const contact = [r.contact.email, r.contact.phone, r.contact.location, ...r.contact.links].filter(Boolean).join("  |  ");
  return (
    <Document title={`${r.contact.name} Resume`} author={r.contact.name}>
      <Page size="LETTER" style={s.page}>
        <Text style={s.name}>{r.contact.name}</Text>
        {contact ? <Text style={s.contact}>{contact}</Text> : null}

        {r.summary ? (
          <View>
            <Text style={s.heading}>Summary</Text>
            <Text>{r.summary}</Text>
          </View>
        ) : null}

        {r.experience.length ? <Text style={s.heading}>Experience</Text> : null}
        {r.experience.map((e, i) => (
          <View key={i} style={s.job} wrap={false}>
            <View style={s.row}>
              <Text style={s.bold}>
                {e.title}
                {e.company ? `, ${e.company}` : ""}
              </Text>
              <Text style={s.muted}>{[e.start, e.end].filter(Boolean).join(" – ")}</Text>
            </View>
            {e.location ? <Text style={s.muted}>{e.location}</Text> : null}
            {e.bullets.map((b, j) => (
              <View key={j} style={s.bullet}>
                <Text style={s.dot}>•</Text>
                <Text style={s.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ))}

        {r.skills.length ? (
          <View>
            <Text style={s.heading}>Skills</Text>
            <Text>{r.skills.join(", ")}</Text>
          </View>
        ) : null}

        {r.education.length ? <Text style={s.heading}>Education</Text> : null}
        {r.education.map((e, i) => (
          <View key={i} style={s.row}>
            <Text>
              <Text style={s.bold}>{[e.degree, e.field].filter(Boolean).join(", ")}</Text>
              {e.school ? `  ${e.school}` : ""}
            </Text>
            <Text style={s.muted}>{e.end}</Text>
          </View>
        ))}

        {r.certifications.length ? (
          <View>
            <Text style={s.heading}>Certifications</Text>
            {r.certifications.map((c, i) => (
              <Text key={i}>{c}</Text>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export function renderResumePdf(resume: Resume): Promise<Buffer> {
  return renderToBuffer(<ResumeDoc r={resume} />);
}
