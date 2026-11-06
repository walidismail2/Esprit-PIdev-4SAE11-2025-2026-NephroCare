package esprit.dialysisservice.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.dialysisservice.entities.DialysisSession;
import esprit.dialysisservice.entities.DialysisTreatment;
import esprit.dialysisservice.entities.SystemConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class SessionReportGenerator {

    private final ObjectMapper objectMapper;

    public GeneratedReport generate(
            DialysisSession session,
            DialysisTreatment treatment,
            SystemConfig cfg,
            String nurseName,
            String patientName,
            String doctorName,
            List<DialysisSession> historyDesc // last N completed, DESC by date
    ) {
        double ktvTh = (cfg != null && cfg.getKtvAlertThreshold() != null) ? cfg.getKtvAlertThreshold() : 1.2;
        double urrTh = 65.0;

        Double urr = session.getUrr();
        Double spKtV = session.getSpKtV();
        Double eKtV = session.getEKtV();
        Double ktv = bestKtv(session);

        boolean urrOk = urr != null && urr >= urrTh;
        boolean ktvOk = ktv != null && ktv >= ktvTh;
        boolean adequate = urrOk && ktvOk;

        Double ufCalc = calcUf(session);
        String ufFlag = ufFlag(ufCalc);

        List<Map<String, Object>> rec = new ArrayList<>();
        addAdequacyRecs(rec, ktv, ktvTh, urr, urrTh, ktvOk, urrOk);
        addUfrRecs(rec, session, treatment, ufCalc);
        addBpRecs(rec, session.getPreBloodPressure());
        addComplicationRecs(rec, session.getComplications());

        HistoryStats stats = computeHistoryStats(historyDesc, session.getId());

        List<String> riskFactors = new ArrayList<>();
        int riskScore = computeRiskScore(session, treatment, ktv, ktvTh, urr, urrTh, ufCalc, stats, riskFactors);
        int stabilityIndex = computeStabilityIndex(stats, adequate, session.getPreBloodPressure(), session.getComplications());
        String riskLevel = riskLevel(riskScore);

        List<Map<String, Object>> anomalies = detectAnomalies(session, ktv, urr, ufCalc, stats);

        Map<String, Object> json = new LinkedHashMap<>();
        json.put("generatedAt", LocalDateTime.now().toString());

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("sessionDate", session.getSessionDate() != null ? session.getSessionDate().toString() : null);
        summary.put("shift", session.getShift() != null ? session.getShift().toString() : null);
        summary.put("nurseName", nurseName);
        summary.put("patientName", patientName);
        summary.put("doctorName", doctorName);
        json.put("summary", summary);

        Map<String, Object> treatmentInfo = new LinkedHashMap<>();
        treatmentInfo.put("dialysisType", String.valueOf(treatment.getDialysisType()));
        treatmentInfo.put("accessType", String.valueOf(treatment.getVascularAccessType()));
        treatmentInfo.put("frequencyPerWeek", treatment.getFrequencyPerWeek());
        treatmentInfo.put("prescribedDurationMinutes", treatment.getPrescribedDurationMinutes());
        treatmentInfo.put("targetDryWeight", treatment.getTargetDryWeight());
        json.put("treatment", treatmentInfo);

        Map<String, Object> adequacyBlock = new LinkedHashMap<>();
        adequacyBlock.put("urr", urr);
        adequacyBlock.put("spKtV", spKtV);
        adequacyBlock.put("eKtV", eKtV);
        adequacyBlock.put("bestKtv", ktv);
        adequacyBlock.put("urrThreshold", urrTh);
        adequacyBlock.put("ktvThreshold", ktvTh);
        adequacyBlock.put("urrPass", urrOk);
        adequacyBlock.put("ktvPass", ktvOk);
        adequacyBlock.put("overallAdequate", adequate);
        json.put("adequacy", adequacyBlock);

        Map<String, Object> fluid = new LinkedHashMap<>();
        fluid.put("weightBefore", session.getWeightBefore());
        fluid.put("weightAfter", session.getWeightAfter());
        fluid.put("ultrafiltrationVolume", session.getUltrafiltrationVolume());
        fluid.put("calculatedUF", ufCalc);
        fluid.put("flag", ufFlag);
        json.put("fluid", fluid);

        Map<String, Object> hemo = new LinkedHashMap<>();
        hemo.put("bloodPressure", session.getPreBloodPressure());
        hemo.put("complications", session.getComplications());
        json.put("hemodynamics", hemo);

        Map<String, Object> decisionSupport = new LinkedHashMap<>();
        decisionSupport.put("dialysisRiskScore", riskScore);
        decisionSupport.put("riskLevel", riskLevel);
        decisionSupport.put("riskFactors", riskFactors);
        decisionSupport.put("patientStabilityIndex", stabilityIndex);
        decisionSupport.put("historyWindow", stats.n);
        decisionSupport.put("baseline", stats.baselineAsJson());
        decisionSupport.put("anomalies", anomalies);
        json.put("decisionSupport", decisionSupport);

        json.put("recommendations", rec);

        String text = buildText(
                session,
                treatment,
                adequate,
                rec,
                riskScore,
                riskLevel,
                riskFactors,
                stabilityIndex,
                anomalies,
                nurseName,
                patientName,
                doctorName
        );

        try {
            String jsonStr = objectMapper.writeValueAsString(json);
            return new GeneratedReport(jsonStr, text, ktvTh, urrTh);
        } catch (Exception e) {
            return new GeneratedReport("{}", text, ktvTh, urrTh);
        }
    }

    // ===============================
    // Decision support computations
    // ===============================

    private int computeRiskScore(
            DialysisSession session,
            DialysisTreatment treatment,
            Double ktv,
            double ktvTh,
            Double urr,
            double urrTh,
            Double ufCalc,
            HistoryStats stats,
            List<String> riskFactors
    ) {
        int score = 0;

        if (ktv == null) {
            score += 10;
            riskFactors.add("Missing Kt/V value");
        } else if (ktv < ktvTh) {
            score += 25;
            riskFactors.add("Low Kt/V");
        } else if (ktv < ktvTh + 0.1) {
            score += 10;
            riskFactors.add("Borderline Kt/V");
        }

        if (urr == null) {
            score += 10;
            riskFactors.add("Missing URR value");
        } else if (urr < urrTh) {
            score += 20;
            riskFactors.add("Low URR");
        } else if (urr < urrTh + 2) {
            score += 8;
            riskFactors.add("Borderline URR");
        }

        Double ufr = calcUfr(session, treatment, ufCalc);
        if (ufr != null) {
            if (ufr > 13) {
                score += 25;
                riskFactors.add("High ultrafiltration rate");
            } else if (ufr > 10) {
                score += 12;
                riskFactors.add("Moderately elevated ultrafiltration rate");
            }
        }

        int[] bp = parseBp(session.getPreBloodPressure());
        if (bp[0] > 0 && bp[1] > 0) {
            int sys = bp[0], dia = bp[1];
            if (sys >= 180 || dia >= 120) {
                score += 30;
                riskFactors.add("Severely elevated blood pressure");
            } else if (sys >= 160 || dia >= 100) {
                score += 15;
                riskFactors.add("Elevated blood pressure");
            } else if (sys < 90 || dia < 60) {
                score += 12;
                riskFactors.add("Low blood pressure");
            }
        }

        String c = safeLower(session.getComplications());
        if (c.contains("hypotens")) {
            score += 20;
            riskFactors.add("Intradialytic hypotension");
        }
        if (c.contains("cramp")) {
            score += 10;
            riskFactors.add("Cramps reported");
        }
        if (c.contains("bleed")) {
            score += 15;
            riskFactors.add("Bleeding reported");
        }
        if (c.contains("chest") || c.contains("pain")) {
            score += 20;
            riskFactors.add("Chest pain reported");
        }

        if (stats.n >= 4 && stats.ktvMean != null && ktv != null && ktv < stats.ktvMean - 0.15) {
            score += 8;
            riskFactors.add("Kt/V below personal baseline");
        }
        if (stats.n >= 4 && stats.urrMean != null && urr != null && urr < stats.urrMean - 5) {
            score += 8;
            riskFactors.add("URR below personal baseline");
        }

        if (treatment.getTargetDryWeight() != null && session.getWeightAfter() != null) {
            double diff = Math.abs(session.getWeightAfter() - treatment.getTargetDryWeight());
            if (diff >= 3.0) {
                score += 15;
                riskFactors.add("Post-dialysis weight far from target dry weight");
            } else if (diff >= 1.5) {
                score += 8;
                riskFactors.add("Post-dialysis weight moderately above target");
            }
        }

        return clampInt(score, 0, 100);
    }

    private int computeStabilityIndex(
            HistoryStats stats,
            boolean adequate,
            String bp,
            String complications
    ) {
        if (stats.n < 3) {
            int base = adequate ? 80 : 60;

            int[] parsed = parseBp(bp);
            if (parsed[0] > 0 && parsed[1] > 0) {
                int sys = parsed[0], dia = parsed[1];
                if (sys >= 180 || dia >= 120) base -= 25;
                else if (sys >= 160 || dia >= 100) base -= 15;
                else if (sys < 90 || dia < 60) base -= 15;
            }

            String c = safeLower(complications);
            if (c.contains("hypotens")) base -= 20;
            if (c.contains("cramp")) base -= 10;
            if (c.contains("bleed")) base -= 15;
            if (c.contains("chest") || c.contains("pain")) base -= 20;

            return clampInt(base, 0, 100);
        }

        double penalty = 0;

        if (stats.ktvStd != null) penalty += Math.min(25, stats.ktvStd * 25);
        if (stats.urrStd != null) penalty += Math.min(25, stats.urrStd * 0.7);
        if (stats.ufStd != null) penalty += Math.min(20, stats.ufStd * 6);
        if (stats.bpSysStd != null) penalty += Math.min(15, stats.bpSysStd * 0.2);

        int index = (int) Math.round(100 - penalty);
        return clampInt(index, 0, 100);
    }

    private String riskLevel(int score) {
        if (score >= 70) return "CRITICAL";
        if (score >= 40) return "HIGH";
        if (score >= 20) return "MODERATE";
        return "LOW";
    }

    private List<Map<String, Object>> detectAnomalies(
            DialysisSession session,
            Double ktv,
            Double urr,
            Double ufCalc,
            HistoryStats stats
    ) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (stats.n < 4) return out;

        addZAnomaly(out, "Kt/V", ktv, stats.ktvMean, stats.ktvStd, 2.0);
        addZAnomaly(out, "URR", urr, stats.urrMean, stats.urrStd, 2.0);

        Double uf = (session.getUltrafiltrationVolume() != null) ? session.getUltrafiltrationVolume() : ufCalc;
        addZAnomaly(out, "UF(L)", uf, stats.ufMean, stats.ufStd, 2.3);

        int[] bp = parseBp(session.getPreBloodPressure());
        if (bp[0] > 0) addZAnomaly(out, "BP_SYS", (double) bp[0], stats.bpSysMean, stats.bpSysStd, 2.3);

        return out;
    }

    private void addZAnomaly(List<Map<String, Object>> out, String metric, Double value,
                             Double mean, Double std, double threshold) {
        if (value == null || mean == null || std == null || std <= 0.000001) return;
        double z = (value - mean) / std;
        if (Math.abs(z) >= threshold) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("metric", metric);
            m.put("value", value);
            m.put("baselineMean", mean);
            m.put("baselineStd", std);
            m.put("zScore", z);
            m.put("severity", Math.abs(z) >= (threshold + 1.0) ? "HIGH" : "MEDIUM");
            out.add(m);
        }
    }

    private HistoryStats computeHistoryStats(List<DialysisSession> historyDesc, UUID currentSessionId) {
        final List<DialysisSession> hist = (historyDesc == null) ? List.of() : historyDesc;

        final List<DialysisSession> filtered = hist.stream()
                .filter(s -> s.getId() != null && !s.getId().equals(currentSessionId))
                .collect(Collectors.toList());

        List<Double> ktv = filtered.stream().map(this::bestKtv).filter(Objects::nonNull).toList();
        List<Double> urr = filtered.stream().map(DialysisSession::getUrr).filter(Objects::nonNull).toList();

        List<Double> uf = filtered.stream()
                .map(s -> s.getUltrafiltrationVolume() != null ? s.getUltrafiltrationVolume() : calcUf(s))
                .filter(Objects::nonNull)
                .toList();

        List<Integer> sys = filtered.stream()
                .map(s -> parseBp(s.getPreBloodPressure())[0])
                .filter(x -> x > 0)
                .toList();

        return new HistoryStats(
                filtered.size(),
                mean(ktv), std(ktv),
                mean(urr), std(urr),
                mean(uf), std(uf),
                meanInt(sys), stdInt(sys)
        );
    }

    // ===============================
    // Recommendations blocks
    // ===============================

    private void addAdequacyRecs(List<Map<String, Object>> rec, Double ktv, double ktvTh,
                                 Double urr, double urrTh, boolean ktvOk, boolean urrOk) {
        if (!ktvOk && !urrOk) {
            addRec(rec, "HIGH", "Inadequate dialysis (clearance below targets)",
                    "Kt/V=" + fmt2(ktv) + " (≥" + ktvTh + "), URR=" + fmt1(urr) + "% (≥" + urrTh + "%)",
                    List.of(
                            "Verify access function (recirculation/stenosis) and blood flow settings.",
                            "Re-check pre/post urea sampling timing and documentation.",
                            "Consider increasing effective duration or frequency if clinically appropriate."
                    ));
        } else if (!ktvOk) {
            addRec(rec, "MEDIUM", "Kt/V below target",
                    "Kt/V=" + fmt2(ktv) + " (≥" + ktvTh + ")",
                    List.of(
                            "Check delivered time vs prescribed time and interruptions.",
                            "Assess access function and needle placement.",
                            "Consider prescription review (duration, dialyzer, blood/dialysate flow)."
                    ));
        } else if (!urrOk) {
            addRec(rec, "MEDIUM", "URR below target",
                    "URR=" + fmt1(urr) + "% (≥" + urrTh + "%)",
                    List.of(
                            "Confirm correct sampling time (pre and post) and lab handling.",
                            "Evaluate clearance/access performance if persistently low."
                    ));
        } else {
            addRec(rec, "INFO", "Adequacy within targets",
                    "Kt/V and URR meet thresholds for this session.",
                    List.of("Continue current monitoring plan."));
        }
    }

    private void addUfrRecs(List<Map<String, Object>> rec, DialysisSession session,
                            DialysisTreatment treatment, Double ufCalc) {
        Double ufr = calcUfr(session, treatment, ufCalc);
        if (ufr == null) return;

        if (ufr > 13.0) {
            addRec(rec, "HIGH", "High ultrafiltration rate (risk of hypotension/cramps)",
                    String.format("UFR=%.1f ml/kg/h", ufr),
                    List.of(
                            "Reassess dry weight and interdialytic weight gain.",
                            "Consider longer session duration or more frequent sessions if feasible.",
                            "Monitor BP symptoms closely; document cramps/hypotension events."
                    ));
        } else if (ufr > 10.0) {
            addRec(rec, "MEDIUM", "Moderately elevated ultrafiltration rate",
                    String.format("UFR=%.1f ml/kg/h", ufr),
                    List.of("Reinforce fluid restriction guidance and monitor tolerance."));
        }
    }

    private void addBpRecs(List<Map<String, Object>> rec, String bpStr) {
        int[] bp = parseBp(bpStr);
        int sys = bp[0], dia = bp[1];
        if (sys <= 0 || dia <= 0) return;

        if (sys >= 180 || dia >= 120) {
            addRec(rec, "HIGH", "Severely elevated pre-dialysis blood pressure",
                    "BP=" + sys + "/" + dia,
                    List.of("Escalate to clinician evaluation and ensure antihypertensive plan is reviewed."));
        } else if (sys < 90 || dia < 60) {
            addRec(rec, "MEDIUM", "Low pre-dialysis blood pressure",
                    "BP=" + sys + "/" + dia,
                    List.of("Assess volume status and review UF target; monitor intradialytic symptoms."));
        }
    }

    private void addComplicationRecs(List<Map<String, Object>> rec, String complications) {
        String c = safeLower(complications);
        if (c.isBlank()) return;

        if (c.contains("cramp")) {
            addRec(rec, "MEDIUM", "Cramps reported", complications,
                    List.of("Consider UF reduction or sodium profiling per protocol."));
        }
        if (c.contains("hypotens")) {
            addRec(rec, "HIGH", "Intradialytic hypotension reported", complications,
                    List.of("Review UF rate, dry weight, and BP management."));
        }
        if (c.contains("nausea") || c.contains("vomit")) {
            addRec(rec, "LOW", "GI symptoms reported", complications,
                    List.of("Monitor and document; evaluate triggers if recurrent."));
        }
    }

    // ===============================
    // Text rendering
    // ===============================

    private String buildText(
            DialysisSession s,
            DialysisTreatment t,
            boolean adequate,
            List<Map<String, Object>> rec,
            int riskScore,
            String riskLevel,
            List<String> riskFactors,
            int stabilityIndex,
            List<Map<String, Object>> anomalies,
            String nurseName,
            String patientName,
            String doctorName
    ) {
        StringBuilder sb = new StringBuilder();

        sb.append("Dialysis Session Report\n");
        sb.append("======================\n");
        sb.append("Date: ").append(s.getSessionDate()).append(" | Shift: ").append(s.getShift()).append("\n");
        sb.append("Patient: ").append(patientName).append("\n");
        sb.append("Doctor: ").append(doctorName).append("\n");
        sb.append("Nurse: ").append(nurseName).append("\n\n");

        sb.append("Decision Support\n");
        sb.append("- Dialysis Risk Score: ").append(riskScore).append("/100").append(" (").append(riskLevel).append(")\n");
        sb.append("- Patient Stability Index: ").append(stabilityIndex).append("/100\n");
        sb.append("- Overall adequacy: ").append(adequate ? "ADEQUATE" : "INADEQUATE").append("\n");

        if (riskFactors != null && !riskFactors.isEmpty()) {
            sb.append("- Main risk factors: ").append(String.join(", ", riskFactors)).append("\n");
        }
        sb.append("\n");

        if (anomalies != null && !anomalies.isEmpty()) {
            sb.append("Anomaly Detection\n");
            for (Map<String, Object> a : anomalies) {
                sb.append("- [").append(a.get("severity")).append("] ")
                        .append(a.get("metric")).append(" anomaly: ")
                        .append("value=").append(a.get("value"))
                        .append(", z=").append(String.format("%.2f", (Double) a.get("zScore")))
                        .append("\n");
            }
            sb.append("\n");
        }

        sb.append("Recommendations\n");
        for (Map<String, Object> r : rec) {
            sb.append("- [").append(r.get("severity")).append("] ")
                    .append(r.get("title")).append("\n");
            sb.append("  Evidence: ").append(r.get("evidence")).append("\n");
            @SuppressWarnings("unchecked")
            List<String> actions = (List<String>) r.get("actions");
            if (actions != null) {
                for (String act : actions) sb.append("  - ").append(act).append("\n");
            }
        }

        return sb.toString();
    }

    // ===============================
    // Helpers
    // ===============================

    private void addRec(List<Map<String, Object>> rec, String severity, String title, String evidence, List<String> actions) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("severity", severity);
        m.put("title", title);
        m.put("evidence", evidence);
        m.put("actions", actions);
        rec.add(m);
    }

    private Double bestKtv(DialysisSession s) {
        if (s == null) return null;
        if (s.getSpKtV() != null) return s.getSpKtV();
        if (s.getEKtV() != null) return s.getEKtV();
        return s.getAchievedKtV();
    }

    private Double calcUf(DialysisSession s) {
        if (s.getWeightBefore() == null || s.getWeightAfter() == null) return null;
        return s.getWeightBefore() - s.getWeightAfter();
    }

    private String ufFlag(Double uf) {
        if (uf == null) return "UNKNOWN";
        if (uf > 3.0) return "HIGH_UF";
        if (uf < 0.5) return "LOW_UF";
        return "NORMAL";
    }

    private Double calcUfr(DialysisSession session, DialysisTreatment treatment, Double ufCalc) {
        Double ufLiters = session.getUltrafiltrationVolume();
        if (ufLiters == null && ufCalc != null) ufLiters = ufCalc;

        Integer durMin = treatment.getPrescribedDurationMinutes();
        Double dry = treatment.getTargetDryWeight();

        if (ufLiters == null || durMin == null || dry == null) return null;
        if (durMin <= 0 || dry <= 0) return null;

        double hours = durMin / 60.0;
        return (ufLiters * 1000.0) / (dry * hours);
    }

    private int[] parseBp(String bp) {
        int sys = -1, dia = -1;
        if (bp != null && bp.contains("/")) {
            try {
                String[] parts = bp.trim().split("/");
                sys = Integer.parseInt(parts[0].trim());
                dia = Integer.parseInt(parts[1].trim());
            } catch (Exception ignored) {
            }
        }
        return new int[]{sys, dia};
    }

    private String safeLower(String s) {
        return s == null ? "" : s.toLowerCase();
    }

    private String fmt2(Double v) {
        return v == null ? "—" : String.format("%.2f", v);
    }

    private String fmt1(Double v) {
        return v == null ? "—" : String.format("%.1f", v);
    }

    private int clampInt(int v, int min, int max) {
        return Math.max(min, Math.min(max, v));
    }

    private Double mean(List<Double> xs) {
        if (xs == null || xs.isEmpty()) return null;
        double sum = 0;
        for (double x : xs) sum += x;
        return sum / xs.size();
    }

    private Double std(List<Double> xs) {
        if (xs == null || xs.size() < 2) return null;
        Double m = mean(xs);
        if (m == null) return null;
        double var = 0;
        for (double x : xs) var += (x - m) * (x - m);
        var /= (xs.size() - 1);
        return Math.sqrt(var);
    }

    private Double meanInt(List<Integer> xs) {
        if (xs == null || xs.isEmpty()) return null;
        double sum = 0;
        for (int x : xs) sum += x;
        return sum / xs.size();
    }

    private Double stdInt(List<Integer> xs) {
        if (xs == null || xs.size() < 2) return null;
        Double m = meanInt(xs);
        if (m == null) return null;
        double var = 0;
        for (int x : xs) var += (x - m) * (x - m);
        var /= (xs.size() - 1);
        return Math.sqrt(var);
    }

    private static class HistoryStats {
        final int n;
        final Double ktvMean, ktvStd;
        final Double urrMean, urrStd;
        final Double ufMean, ufStd;
        final Double bpSysMean, bpSysStd;

        HistoryStats(int n,
                     Double ktvMean, Double ktvStd,
                     Double urrMean, Double urrStd,
                     Double ufMean, Double ufStd,
                     Double bpSysMean, Double bpSysStd) {
            this.n = n;
            this.ktvMean = ktvMean;
            this.ktvStd = ktvStd;
            this.urrMean = urrMean;
            this.urrStd = urrStd;
            this.ufMean = ufMean;
            this.ufStd = ufStd;
            this.bpSysMean = bpSysMean;
            this.bpSysStd = bpSysStd;
        }

        Map<String, Object> baselineAsJson() {
            Map<String, Object> b = new LinkedHashMap<>();
            b.put("ktvMean", ktvMean);
            b.put("ktvStd", ktvStd);
            b.put("urrMean", urrMean);
            b.put("urrStd", urrStd);
            b.put("ufMean", ufMean);
            b.put("ufStd", ufStd);
            b.put("bpSysMean", bpSysMean);
            b.put("bpSysStd", bpSysStd);
            return b;
        }
    }

    public record GeneratedReport(String jsonStr, String text, double ktvThreshold, double urrThreshold) {}
}