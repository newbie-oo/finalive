import path from "node:path";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

const fontDir = path.resolve(process.cwd(), "public/fonts");

Font.register({
  family: "Sarabun",
  fonts: [
    { src: path.join(fontDir, "Sarabun-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "Sarabun-Bold.ttf"), fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Sarabun",
    backgroundColor: "#ffffff",
  },
  borderBox: {
    border: "2pt solid #1a1a1a",
    padding: 30,
    height: "100%",
    position: "relative",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
  },
  body: {
    textAlign: "center",
    marginVertical: 30,
  },
  presentedTo: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 8,
  },
  studentName: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 12,
    color: "#1a1a1a",
  },
  courseLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 8,
  },
  courseName: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 8,
    color: "#1a1a1a",
  },
  completionDate: {
    fontSize: 12,
    color: "#666666",
    marginTop: 8,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 10,
    color: "#999999",
  },
  certCode: {
    fontSize: 9,
    color: "#999999",
    marginTop: 4,
  },
});

export interface CertificateData {
  studentName: string;
  courseTitle: string;
  completedAt: Date;
  certCode: string;
}

export function CertificateDoc({
  studentName,
  courseTitle,
  completedAt,
  certCode,
}: CertificateData) {
  const dateStr = completedAt.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.borderBox}>
          <View style={styles.header}>
            <Text style={styles.title}>Certificate of Completion</Text>
            <Text style={styles.subtitle}>ใบรับรองการสำเร็จการศึกษา</Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.presentedTo}>Presented to</Text>
            <Text style={styles.studentName}>{studentName}</Text>

            <Text style={styles.courseLabel}>For successfully completing</Text>
            <Text style={styles.courseName}>{courseTitle}</Text>

            <Text style={styles.completionDate}>วันที่สำเร็จ: {dateStr}</Text>
          </View>

          <View style={styles.footer}>
            <View>
              <Text style={styles.footerText}>Finalive Learning Platform</Text>
              <Text style={styles.certCode}>เลขที่: {certCode}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
