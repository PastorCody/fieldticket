import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { StructuredTicket, Profile } from "@/types";

const orange = "#ff6b35";
const navy = "#1a1a2e";
const gray = "#666666";
const lightGray = "#e5e7eb";
const bgGray = "#f3f4f6";

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: navy,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: orange,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: navy },
  headerCompany: { fontSize: 10, color: gray, marginTop: 2 },
  headerRight: { textAlign: "right" },
  ticketNum: { fontSize: 10, color: gray },
  ticketDate: { fontSize: 9, color: "#888", marginTop: 2 },
  // Sections
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: orange,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  // Grid rows
  gridRow: { flexDirection: "row", marginBottom: 6 },
  gridCol: { flex: 1 },
  fieldLabel: {
    fontSize: 7,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  fieldValue: { fontSize: 10 },
  fieldValueLarge: { fontSize: 14, fontWeight: "bold" },
  // Description
  description: { fontSize: 10, lineHeight: 1.5 },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: bgGray,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: "bold",
    color: gray,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: lightGray,
  },
  tableCell: { fontSize: 9 },
  // List
  listItem: { flexDirection: "row", marginBottom: 2 },
  bullet: { width: 10, fontSize: 9 },
  listText: { fontSize: 9, flex: 1 },
  // Footer
  footer: {
    marginTop: 28,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: navy,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerLabel: {
    fontSize: 7,
    color: "#888",
    textTransform: "uppercase",
  },
  footerValue: { fontSize: 10, fontWeight: "bold", marginTop: 2 },
  sigLine: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#333",
    width: 180,
    paddingTop: 3,
  },
  sigLabel: { fontSize: 7, color: "#888" },
  // Branding
  branding: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 7,
    color: "#bbb",
  },
});

interface FieldTicketPDFProps {
  ticket: StructuredTicket;
  profile: Profile;
  ticketNumber: string;
}

export function FieldTicketPDF({
  ticket,
  profile,
  ticketNumber,
}: FieldTicketPDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>FIELD TICKET</Text>
            <Text style={s.headerCompany}>
              {profile.company_name || ""}
            </Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.ticketNum}>{ticketNumber}</Text>
            <Text style={s.ticketDate}>{ticket.job_date}</Text>
          </View>
        </View>

        {/* Job Information */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Job Information</Text>
          <View style={s.gridRow}>
            <View style={s.gridCol}>
              <Text style={s.fieldLabel}>Job Type</Text>
              <Text style={s.fieldValue}>{ticket.job_type || "\u2014"}</Text>
            </View>
            <View style={s.gridCol}>
              <Text style={s.fieldLabel}>Well Name</Text>
              <Text style={s.fieldValue}>{ticket.well_name || "\u2014"}</Text>
            </View>
          </View>
          <View style={s.gridRow}>
            <View style={s.gridCol}>
              <Text style={s.fieldLabel}>Lease Name</Text>
              <Text style={s.fieldValue}>
                {ticket.lease_name || "\u2014"}
              </Text>
            </View>
            <View style={s.gridCol}>
              <Text style={s.fieldLabel}>Operator</Text>
              <Text style={s.fieldValue}>{ticket.operator || "\u2014"}</Text>
            </View>
          </View>
          <View style={s.gridRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Location</Text>
              <Text style={s.fieldValue}>{ticket.location || "\u2014"}</Text>
            </View>
          </View>
        </View>

        {/* Time */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Time</Text>
          <View style={s.gridRow}>
            <View style={s.gridCol}>
              <Text style={s.fieldLabel}>Start</Text>
              <Text style={s.fieldValue}>
                {ticket.start_time || "\u2014"}
              </Text>
            </View>
            <View style={s.gridCol}>
              <Text style={s.fieldLabel}>End</Text>
              <Text style={s.fieldValue}>{ticket.end_time || "\u2014"}</Text>
            </View>
            <View style={s.gridCol}>
              <Text style={s.fieldLabel}>Total Hours</Text>
              <Text style={s.fieldValueLarge}>
                {ticket.hours_worked || "\u2014"}
              </Text>
            </View>
          </View>
        </View>

        {/* Work Description */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Work Description</Text>
          <Text style={s.description}>
            {ticket.work_description || "\u2014"}
          </Text>
        </View>

        {/* Equipment */}
        {ticket.equipment_used.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Equipment Used</Text>
            {ticket.equipment_used.map((item, i) => (
              <View key={i} style={s.listItem}>
                <Text style={s.bullet}>{"\u2022"}</Text>
                <Text style={s.listText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Materials */}
        {ticket.materials_used.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Materials Used</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { flex: 3 }]}>Item</Text>
              <Text style={[s.tableHeaderCell, { flex: 1, textAlign: "center" }]}>
                Qty
              </Text>
              <Text style={[s.tableHeaderCell, { flex: 1, textAlign: "center" }]}>
                Unit
              </Text>
            </View>
            {ticket.materials_used.map((m, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 3 }]}>{m.item}</Text>
                <Text style={[s.tableCell, { flex: 1, textAlign: "center" }]}>
                  {m.quantity}
                </Text>
                <Text style={[s.tableCell, { flex: 1, textAlign: "center" }]}>
                  {m.unit}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Safety Notes */}
        {ticket.safety_notes && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Safety Notes</Text>
            <Text style={s.description}>{ticket.safety_notes}</Text>
          </View>
        )}

        {/* Additional Notes */}
        {ticket.additional_notes && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Additional Notes</Text>
            <Text style={s.description}>{ticket.additional_notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <View>
            <Text style={s.footerLabel}>Worker</Text>
            <Text style={s.footerValue}>{profile.full_name}</Text>
            <Text style={{ fontSize: 9, color: gray }}>
              {profile.company_name || ""}
            </Text>
            <View style={s.sigLine}>
              <Text style={s.sigLabel}>Signature</Text>
            </View>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={s.footerLabel}>Date</Text>
            <Text style={s.footerValue}>{ticket.job_date}</Text>
          </View>
        </View>

        <Text style={s.branding}>Generated by FieldTicket</Text>
      </Page>
    </Document>
  );
}
