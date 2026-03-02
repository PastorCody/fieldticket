import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { StructuredTicket, Profile, PricingData } from "@/types";

/* ── Brand palette ─────────────────────────────────────── */
const orange = "#ff6b35";
const orangeLight = "#fff3ed";
const navy = "#1a1a2e";
const navyMid = "#2d2d48";
const white = "#ffffff";
const gray50 = "#f9fafb";
const gray100 = "#f3f4f6";
const gray200 = "#e5e7eb";
const gray400 = "#9ca3af";
const gray500 = "#6b7280";
const gray600 = "#4b5563";
const gray800 = "#1f2937";

/* ── Styles ────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: gray800,
    backgroundColor: white,
  },

  /* ── Top banner ────────────────────────────────────── */
  banner: {
    backgroundColor: navy,
    paddingVertical: 24,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bannerLeft: {},
  bannerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: orange,
    letterSpacing: 1.5,
  },
  bannerSubtitle: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 3,
    letterSpacing: 0.5,
  },
  bannerRight: {
    textAlign: "right",
    alignItems: "flex-end",
  },
  ticketNumLabel: {
    fontSize: 7,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  ticketNum: {
    fontSize: 13,
    fontWeight: "bold",
    color: white,
    marginTop: 2,
  },
  ticketDate: {
    fontSize: 9,
    color: orange,
    marginTop: 4,
  },

  /* ── Orange accent bar ─────────────────────────────── */
  accentBar: {
    height: 4,
    backgroundColor: orange,
  },

  /* ── Body container ────────────────────────────────── */
  body: {
    paddingHorizontal: 40,
    paddingTop: 20,
  },

  /* ── Key info strip (job type + hours hero) ────────── */
  heroStrip: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 12,
  },
  heroCard: {
    flex: 1,
    backgroundColor: gray50,
    borderWidth: 1,
    borderColor: gray200,
    borderRadius: 6,
    padding: 12,
  },
  heroCardAccent: {
    flex: 1,
    backgroundColor: orangeLight,
    borderWidth: 1,
    borderColor: "#ffd4bc",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  heroLabel: {
    fontSize: 7,
    color: gray500,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  heroValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: navy,
  },
  heroValueBig: {
    fontSize: 22,
    fontWeight: "bold",
    color: orange,
  },
  heroValueSub: {
    fontSize: 8,
    color: gray500,
    marginTop: 1,
  },

  /* ── Sections ──────────────────────────────────────── */
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: orange,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: navy,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  /* ── Grid rows ─────────────────────────────────────── */
  gridRow: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 16,
  },
  gridCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 7,
    color: gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 10,
    color: gray800,
  },

  /* ── Description block ─────────────────────────────── */
  descriptionBox: {
    backgroundColor: gray50,
    borderLeftWidth: 3,
    borderLeftColor: orange,
    padding: 12,
    borderRadius: 4,
  },
  description: {
    fontSize: 10,
    lineHeight: 1.6,
    color: gray600,
  },

  /* ── Equipment list ────────────────────────────────── */
  equipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  equipChip: {
    backgroundColor: gray100,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: gray200,
  },
  equipText: {
    fontSize: 9,
    color: gray800,
  },

  /* ── Materials table ───────────────────────────────── */
  tableContainer: {
    borderWidth: 1,
    borderColor: gray200,
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: navy,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: "bold",
    color: white,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: gray100,
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: gray100,
    backgroundColor: gray50,
  },
  tableCell: {
    fontSize: 9,
    color: gray800,
  },

  /* ── Notes box ─────────────────────────────────────── */
  notesBox: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 4,
    padding: 10,
  },
  notesText: {
    fontSize: 9,
    lineHeight: 1.5,
    color: gray600,
  },

  /* ── Safety box ────────────────────────────────────── */
  safetyBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 4,
    padding: 10,
  },

  /* ── Divider ───────────────────────────────────────── */
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: gray200,
    marginVertical: 12,
  },

  /* ── Footer ────────────────────────────────────────── */
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: navy,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  footerCol: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 7,
    color: gray500,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: navy,
  },
  footerSub: {
    fontSize: 9,
    color: gray500,
    marginTop: 1,
  },
  sigLine: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: gray400,
    width: 200,
    paddingTop: 4,
  },
  sigLabel: {
    fontSize: 7,
    color: gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* ── Bottom branding ───────────────────────────────── */
  brandingBar: {
    marginTop: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: gray200,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandingText: {
    fontSize: 7,
    color: "#bbb",
  },
  brandingLogo: {
    fontSize: 8,
    fontWeight: "bold",
    color: orange,
    letterSpacing: 0.5,
  },
});

/* ── Component ─────────────────────────────────────────── */
interface FieldTicketPDFProps {
  ticket: StructuredTicket;
  profile: Profile;
  ticketNumber: string;
  pricing?: PricingData | null;
}

export function FieldTicketPDF({
  ticket,
  profile,
  ticketNumber,
  pricing,
}: FieldTicketPDFProps) {
  const equipment = ticket.equipment_used ?? [];
  const materials = ticket.materials_used ?? [];
  const hasPricing = pricing && (pricing.rate_type !== "none" || (pricing.line_items?.length ?? 0) > 0);

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* ── Navy banner with ticket info ────────────── */}
        <View style={s.banner}>
          <View style={s.bannerLeft}>
            <Text style={s.bannerTitle}>FIELD TICKET</Text>
            <Text style={s.bannerSubtitle}>
              {profile.company_name || profile.full_name}
            </Text>
          </View>
          <View style={s.bannerRight}>
            <Text style={s.ticketNumLabel}>Ticket Number</Text>
            <Text style={s.ticketNum}>{ticketNumber}</Text>
            <Text style={s.ticketDate}>{ticket.job_date}</Text>
          </View>
        </View>

        {/* ── Orange accent bar ──────────────────────── */}
        <View style={s.accentBar} />

        {/* ── Body ───────────────────────────────────── */}
        <View style={s.body}>
          {/* ── Hero strip: Job Type + Well + Hours ──── */}
          <View style={s.heroStrip}>
            <View style={s.heroCard}>
              <Text style={s.heroLabel}>Job Type</Text>
              <Text style={s.heroValue}>
                {ticket.job_type || "\u2014"}
              </Text>
            </View>
            <View style={s.heroCard}>
              <Text style={s.heroLabel}>Well Name</Text>
              <Text style={s.heroValue}>
                {ticket.well_name || "\u2014"}
              </Text>
            </View>
            <View style={s.heroCardAccent}>
              <Text style={s.heroLabel}>Total Hours</Text>
              <Text style={s.heroValueBig}>
                {ticket.hours_worked || "\u2014"}
              </Text>
              {ticket.start_time && ticket.end_time && (
                <Text style={s.heroValueSub}>
                  {ticket.start_time} \u2013 {ticket.end_time}
                </Text>
              )}
            </View>
          </View>

          {/* ── Job Details ──────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Job Details</Text>
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
                <Text style={s.fieldValue}>
                  {ticket.operator || "\u2014"}
                </Text>
              </View>
              <View style={s.gridCol}>
                <Text style={s.fieldLabel}>Location</Text>
                <Text style={s.fieldValue}>
                  {ticket.location || "\u2014"}
                </Text>
              </View>
            </View>
            <View style={s.gridRow}>
              <View style={s.gridCol}>
                <Text style={s.fieldLabel}>Date</Text>
                <Text style={s.fieldValue}>
                  {ticket.job_date || "\u2014"}
                </Text>
              </View>
              <View style={s.gridCol}>
                <Text style={s.fieldLabel}>Start Time</Text>
                <Text style={s.fieldValue}>
                  {ticket.start_time || "\u2014"}
                </Text>
              </View>
              <View style={s.gridCol}>
                <Text style={s.fieldLabel}>End Time</Text>
                <Text style={s.fieldValue}>
                  {ticket.end_time || "\u2014"}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Work Description ─────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Work Description</Text>
            </View>
            <View style={s.descriptionBox}>
              <Text style={s.description}>
                {ticket.work_description || "\u2014"}
              </Text>
            </View>
          </View>

          {/* ── Equipment Used ────────────────────────── */}
          {equipment.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Equipment Used</Text>
              </View>
              <View style={s.equipGrid}>
                {equipment.map((item, i) => (
                  <View key={i} style={s.equipChip}>
                    <Text style={s.equipText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Materials Used ────────────────────────── */}
          {materials.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Materials Used</Text>
              </View>
              <View style={s.tableContainer}>
                <View style={s.tableHeader}>
                  <Text style={[s.tableHeaderCell, { flex: 4 }]}>
                    Item
                  </Text>
                  <Text
                    style={[
                      s.tableHeaderCell,
                      { flex: 1, textAlign: "center" },
                    ]}
                  >
                    Qty
                  </Text>
                  <Text
                    style={[
                      s.tableHeaderCell,
                      { flex: 1, textAlign: "center" },
                    ]}
                  >
                    Unit
                  </Text>
                </View>
                {materials.map((m, i) => (
                  <View
                    key={i}
                    style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
                  >
                    <Text style={[s.tableCell, { flex: 4 }]}>
                      {m.item}
                    </Text>
                    <Text
                      style={[
                        s.tableCell,
                        { flex: 1, textAlign: "center" },
                      ]}
                    >
                      {m.quantity}
                    </Text>
                    <Text
                      style={[
                        s.tableCell,
                        { flex: 1, textAlign: "center" },
                      ]}
                    >
                      {m.unit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Pricing ────────────────────────────────── */}
          {hasPricing && pricing && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Pricing</Text>
              </View>

              {/* Rate info */}
              {pricing.rate_type !== "none" && (
                <View style={s.gridRow}>
                  <View style={s.gridCol}>
                    <Text style={s.fieldLabel}>Rate Type</Text>
                    <Text style={s.fieldValue}>
                      {pricing.rate_type === "day" ? "Day Rate" : pricing.rate_type === "hourly" ? "Hourly Rate" : "Flat Rate"}
                    </Text>
                  </View>
                  <View style={s.gridCol}>
                    <Text style={s.fieldLabel}>Rate</Text>
                    <Text style={s.fieldValue}>
                      ${(pricing.day_rate || pricing.hourly_rate || pricing.flat_rate || 0).toFixed(2)}
                      {pricing.rate_type === "hourly" ? "/hr" : pricing.rate_type === "day" ? "/day" : ""}
                    </Text>
                  </View>
                  <View style={s.gridCol}>
                    <Text style={s.fieldLabel}>Subtotal</Text>
                    <Text style={[s.fieldValue, { fontWeight: "bold", color: orange }]}>
                      ${(pricing.subtotal || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Line items */}
              {(pricing.line_items?.length ?? 0) > 0 && (
                <View style={s.tableContainer}>
                  <View style={s.tableHeader}>
                    <Text style={[s.tableHeaderCell, { flex: 4 }]}>Description</Text>
                    <Text style={[s.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Qty</Text>
                    <Text style={[s.tableHeaderCell, { flex: 1.5, textAlign: "right" }]}>Price</Text>
                    <Text style={[s.tableHeaderCell, { flex: 1.5, textAlign: "right" }]}>Total</Text>
                  </View>
                  {pricing.line_items.map((li, i) => (
                    <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                      <Text style={[s.tableCell, { flex: 4 }]}>{li.description}</Text>
                      <Text style={[s.tableCell, { flex: 1, textAlign: "center" }]}>{li.quantity}</Text>
                      <Text style={[s.tableCell, { flex: 1.5, textAlign: "right" }]}>${li.unit_price.toFixed(2)}</Text>
                      <Text style={[s.tableCell, { flex: 1.5, textAlign: "right" }]}>${li.total.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Grand total */}
              {pricing.total != null && pricing.total > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
                  <View style={{ backgroundColor: orangeLight, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 16, borderWidth: 1, borderColor: "#ffd4bc" }}>
                    <Text style={{ fontSize: 8, color: gray500, textTransform: "uppercase", letterSpacing: 0.5 }}>Grand Total</Text>
                    <Text style={{ fontSize: 16, fontWeight: "bold", color: orange, textAlign: "right" }}>${pricing.total.toFixed(2)}</Text>
                  </View>
                </View>
              )}

              {/* Pricing notes */}
              {pricing.notes && (
                <View style={[s.notesBox, { marginTop: 8 }]}>
                  <Text style={s.notesText}>{pricing.notes}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Safety Notes ─────────────────────────── */}
          {ticket.safety_notes && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Safety Notes</Text>
              </View>
              <View style={s.safetyBox}>
                <Text style={s.notesText}>{ticket.safety_notes}</Text>
              </View>
            </View>
          )}

          {/* ── Additional Notes ─────────────────────── */}
          {ticket.additional_notes && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Additional Notes</Text>
              </View>
              <View style={s.notesBox}>
                <Text style={s.notesText}>
                  {ticket.additional_notes}
                </Text>
              </View>
            </View>
          )}

          {/* ── Custom Fields ──────────────────────── */}
          {(ticket.custom_fields ?? []).length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Additional Information</Text>
              </View>
              {(ticket.custom_fields ?? []).map((cf, i) => (
                <View key={i} style={s.gridRow}>
                  <View style={s.gridCol}>
                    <Text style={s.fieldLabel}>{cf.label}</Text>
                    <Text style={s.fieldValue}>{cf.value || "\u2014"}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Footer / Signatures ──────────────────── */}
          <View style={s.footer}>
            <View style={s.footerRow}>
              <View style={s.footerCol}>
                <Text style={s.footerLabel}>Submitted By</Text>
                <Text style={s.footerValue}>{profile.full_name}</Text>
                <Text style={s.footerSub}>
                  {profile.company_name || ""}
                </Text>
                {profile.phone && (
                  <Text style={s.footerSub}>{profile.phone}</Text>
                )}
                <Text style={s.footerSub}>{profile.email}</Text>
              </View>
              <View
                style={[
                  s.footerCol,
                  { alignItems: "flex-end", textAlign: "right" },
                ]}
              >
                <Text style={s.footerLabel}>Date Submitted</Text>
                <Text style={s.footerValue}>{ticket.job_date}</Text>
              </View>
            </View>

            {/* Signature lines */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <View>
                <View style={s.sigLine}>
                  <Text style={s.sigLabel}>Worker Signature</Text>
                </View>
              </View>
              <View>
                <View style={[s.sigLine, { alignItems: "flex-end" }]}>
                  <Text style={s.sigLabel}>
                    Authorized Representative
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Bottom branding ──────────────────────── */}
          <View style={s.brandingBar}>
            <Text style={s.brandingText}>
              This document was generated electronically and serves as
              an official record of work performed.
            </Text>
            <Text style={s.brandingLogo}>FieldTicket</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
