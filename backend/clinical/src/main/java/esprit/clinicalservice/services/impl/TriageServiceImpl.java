package esprit.clinicalservice.services.impl;

import esprit.clinicalservice.dtos.DoctorEfficiencyDTO;
import esprit.clinicalservice.entities.EscalationEvent;
import esprit.clinicalservice.entities.TriageAssessment;
import esprit.clinicalservice.entities.TriageQueueItem;
import esprit.clinicalservice.entities.enums.EscalationType;
import esprit.clinicalservice.entities.enums.QueueStatus;
import esprit.clinicalservice.entities.enums.TriageLevel;
import esprit.clinicalservice.exceptions.ResourceNotFoundException;
import esprit.clinicalservice.repositories.EscalationEventRepository;
import esprit.clinicalservice.repositories.TriageAssessmentRepository;
import esprit.clinicalservice.repositories.TriageQueueItemRepository;
import esprit.clinicalservice.services.TriageService;
import esprit.clinicalservice.services.UserDirectoryClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TriageServiceImpl implements TriageService {

    private static final Logger logger = LoggerFactory.getLogger(TriageServiceImpl.class);
    private static final int ESCALATION_STEP_MINUTES = 10;
    private static final int STALLED_IN_PROGRESS_WARNING_MINUTES = 120;

    private final TriageAssessmentRepository assessmentRepository;
    private final TriageQueueItemRepository queueItemRepository;
    private final EscalationEventRepository escalationEventRepository;
    private final UserDirectoryClient userDirectoryClient;

    public TriageServiceImpl(
            TriageAssessmentRepository assessmentRepository,
            TriageQueueItemRepository queueItemRepository,
            EscalationEventRepository escalationEventRepository,
            UserDirectoryClient userDirectoryClient
    ) {
        this.assessmentRepository = assessmentRepository;
        this.queueItemRepository = queueItemRepository;
        this.escalationEventRepository = escalationEventRepository;
        this.userDirectoryClient = userDirectoryClient;
    }

    @Override
    @Transactional
    public TriageQueueItem createAssessmentAndQueueItem(TriageAssessment assessment) {
        ScoreResult scoreResult = computeScoreResult(assessment);

        assessment.setScore(scoreResult.score());
        assessment.setTriageLevel(scoreResult.level());
        assessment.setRecommendedMaxWaitMinutes(scoreResult.maxWaitMinutes());
        assessment.setCreatedAt(LocalDateTime.now());

        TriageAssessment savedAssessment = assessmentRepository.save(assessment);

        TriageQueueItem queueItem = new TriageQueueItem();
        queueItem.setAssessment(savedAssessment);
        queueItem.setTriageLevel(scoreResult.level());
        queueItem.setPriorityRank(scoreResult.level().getPriorityRank());
        queueItem.setMaxWaitMinutes(scoreResult.maxWaitMinutes());
        queueItem.setDeadlineAt(savedAssessment.getArrivalTime().plusMinutes(scoreResult.maxWaitMinutes()));
        queueItem.setStatus(QueueStatus.WAITING);
        queueItem.setManualOverride(false);
        queueItem.setSepsisAlert(scoreResult.sepsisAlert());

        TriageQueueItem savedQueueItem = queueItemRepository.save(queueItem);
        if (scoreResult.sepsisAlert()) {
            emitEscalation(savedQueueItem, EscalationType.SEPSIS_ALERT, LocalDateTime.now());
        }

        logger.info(
                "Created triage queue item for patient {} with level {} and score {} (sepsisAlert={})",
                savedAssessment.getPatientId(),
                scoreResult.level(),
                scoreResult.score(),
                scoreResult.sepsisAlert()
        );
        return savedQueueItem;
    }

    @Override
    public List<TriageQueueItem> getPrioritizedQueue() {
        return queueItemRepository.findByStatusInOrderByPriorityRankAscDeadlineAtAscCreatedAtAsc(
                List.of(QueueStatus.WAITING, QueueStatus.IN_PROGRESS)
        );
    }

    @Override
    @Transactional
    public TriageQueueItem startCare(Long queueItemId, Long doctorId) {
        TriageQueueItem queueItem = getQueueItemOrThrow(queueItemId);
        if (queueItem.getStatus() == QueueStatus.COMPLETED || queueItem.getStatus() == QueueStatus.CANCELLED) {
            throw new IllegalStateException("Cannot start care for a closed queue item");
        }

        Long assignedDoctorId = (doctorId != null && doctorId > 0) ? doctorId : selectLeastLoadedDoctorId();
        if (assignedDoctorId == null) {
            throw new IllegalStateException("No available doctor found for automatic triage assignment");
        }

        queueItem.setStatus(QueueStatus.IN_PROGRESS);
        queueItem.setAssignedDoctorId(assignedDoctorId);
        if (queueItem.getStartedAt() == null) {
            queueItem.setStartedAt(LocalDateTime.now());
        }
        return queueItemRepository.save(queueItem);
    }

    @Override
    @Transactional
    public TriageQueueItem closeQueueItem(Long queueItemId) {
        TriageQueueItem queueItem = getQueueItemOrThrow(queueItemId);
        if (queueItem.getStatus() == QueueStatus.COMPLETED || queueItem.getStatus() == QueueStatus.CANCELLED) {
            throw new IllegalStateException("Queue item is already closed");
        }

        queueItem.setStatus(QueueStatus.COMPLETED);
        if (queueItem.getStartedAt() == null) {
            queueItem.setStartedAt(LocalDateTime.now());
        }
        queueItem.setCompletedAt(LocalDateTime.now());
        return queueItemRepository.save(queueItem);
    }

    @Override
    @Transactional
    public TriageQueueItem overridePriority(Long queueItemId, TriageLevel triageLevel, Integer maxWaitMinutes, String reason) {
        TriageQueueItem queueItem = getQueueItemOrThrow(queueItemId);
        if (queueItem.getStatus() == QueueStatus.COMPLETED || queueItem.getStatus() == QueueStatus.CANCELLED) {
            throw new IllegalStateException("Cannot override priority for a closed queue item");
        }
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("Override reason is required");
        }

        int appliedMaxWait = maxWaitMinutes != null ? maxWaitMinutes : defaultMaxWait(triageLevel);
        queueItem.setTriageLevel(triageLevel);
        queueItem.setPriorityRank(triageLevel.getPriorityRank());
        queueItem.setMaxWaitMinutes(appliedMaxWait);
        queueItem.setDeadlineAt(LocalDateTime.now().plusMinutes(appliedMaxWait));
        queueItem.setManualOverride(true);
        queueItem.setOverrideReason(reason.trim());

        TriageAssessment assessment = queueItem.getAssessment();
        assessment.setTriageLevel(triageLevel);
        assessment.setRecommendedMaxWaitMinutes(appliedMaxWait);
        assessmentRepository.save(assessment);

        return queueItemRepository.save(queueItem);
    }

    @Override
    public List<DoctorEfficiencyDTO> getDoctorEfficiency(LocalDateTime from, LocalDateTime to) {
        List<TriageQueueItem> items = queueItemRepository.findByAssignedDoctorIdIsNotNullAndStartedAtBetween(from, to);
        Map<Long, DoctorEfficiencyAccumulator> byDoctor = new HashMap<>();

        for (TriageQueueItem item : items) {
            Long doctorId = item.getAssignedDoctorId();
            if (doctorId == null || item.getStartedAt() == null) {
                continue;
            }

            DoctorEfficiencyAccumulator acc = byDoctor.computeIfAbsent(doctorId, ignored -> new DoctorEfficiencyAccumulator());
            acc.assignedCases++;

            if (item.getCompletedAt() != null) {
                acc.completedCases++;
            }

            if (item.getDeadlineAt() != null && !item.getStartedAt().isAfter(item.getDeadlineAt())) {
                acc.slaRespectedCases++;
            }

            long startDelay = Math.max(0, Duration.between(item.getAssessment().getArrivalTime(), item.getStartedAt()).toMinutes());
            acc.startDelayTotal += startDelay;

            if (item.getCompletedAt() != null) {
                long treatmentDuration = Math.max(0, Duration.between(item.getStartedAt(), item.getCompletedAt()).toMinutes());
                acc.treatmentMinutesTotal += treatmentDuration;
                acc.treatmentSamples++;
            }

            TriageLevel level = item.getTriageLevel();
            if (level == TriageLevel.RED || level == TriageLevel.ORANGE) {
                acc.highAcuityCases++;
            }
        }

        List<DoctorEfficiencyDTO> result = new ArrayList<>();
        for (Map.Entry<Long, DoctorEfficiencyAccumulator> entry : byDoctor.entrySet()) {
            Long doctorId = entry.getKey();
            DoctorEfficiencyAccumulator acc = entry.getValue();
            if (acc.assignedCases == 0) {
                continue;
            }

            double completionRate = ratio(acc.completedCases, acc.assignedCases);
            double slaRespectRate = ratio(acc.slaRespectedCases, acc.assignedCases);
            double avgStartDelay = (double) acc.startDelayTotal / acc.assignedCases;
            double avgTreatment = acc.treatmentSamples > 0
                    ? (double) acc.treatmentMinutesTotal / acc.treatmentSamples
                    : 0.0;

            double startDelayScore = clamp(100.0 - (avgStartDelay * 2.0));
            double treatmentSpeedScore = clamp(100.0 - (avgTreatment * 0.5));
            double speedScore = (startDelayScore + treatmentSpeedScore) / 2.0;
            double highAcuityScore = clamp(acc.highAcuityCases * 10.0);
            double efficiencyScore = (0.4 * slaRespectRate)
                    + (0.3 * completionRate)
                    + (0.2 * speedScore)
                    + (0.1 * highAcuityScore);

            DoctorEfficiencyDTO dto = new DoctorEfficiencyDTO();
            dto.setDoctorId(doctorId);
            dto.setAssignedCases(acc.assignedCases);
            dto.setCompletedCases(acc.completedCases);
            dto.setHighAcuityCases(acc.highAcuityCases);
            dto.setCompletionRate(round2(completionRate));
            dto.setSlaRespectRate(round2(slaRespectRate));
            dto.setAvgStartDelayMinutes(round2(avgStartDelay));
            dto.setAvgTreatmentMinutes(round2(avgTreatment));
            dto.setEfficiencyScore(round2(efficiencyScore));
            result.add(dto);
        }

        result.sort(Comparator.comparingDouble(DoctorEfficiencyDTO::getEfficiencyScore).reversed());
        return result;
    }

    @Override
    @Transactional
    public void processOverdueEscalations() {
        LocalDateTime now = LocalDateTime.now();
        List<TriageQueueItem> overdueItems = queueItemRepository.findByStatusAndDeadlineAtBefore(QueueStatus.WAITING, now);
        for (TriageQueueItem queueItem : overdueItems) {
            EscalationType nextType = determineNextEscalation(queueItem, now);
            if (nextType == null) {
                continue;
            }
            emitEscalation(queueItem, nextType, now);
        }
    }

    @Override
    @Transactional
    public void processStalledInProgressItems() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threshold = now.minusMinutes(STALLED_IN_PROGRESS_WARNING_MINUTES);
        List<TriageQueueItem> stalledItems = queueItemRepository.findByStatusAndStartedAtBefore(QueueStatus.IN_PROGRESS, threshold);

        for (TriageQueueItem queueItem : stalledItems) {
            if (queueItem.getLastEscalationType() != EscalationType.LEVEL_3) {
                emitEscalation(queueItem, EscalationType.LEVEL_3, now);
            } else {
                logger.warn(
                        "Stalled in-progress triage item {} for patient {} has been in progress since {}",
                        queueItem.getId(),
                        queueItem.getAssessment().getPatientId(),
                        queueItem.getStartedAt()
                );
            }
        }
    }

    private EscalationType determineNextEscalation(TriageQueueItem queueItem, LocalDateTime now) {
        if (queueItem.getTriageLevel() == TriageLevel.RED) {
            return queueItem.getLastEscalationType() == EscalationType.LEVEL_3 ? null : EscalationType.LEVEL_3;
        }

        EscalationType lastType = queueItem.getLastEscalationType();
        if (lastType == null) {
            return EscalationType.LEVEL_1;
        }

        if (queueItem.getLastEscalationAt() == null) {
            return nextEscalation(lastType);
        }

        long minutesSinceLastEscalation = Duration.between(queueItem.getLastEscalationAt(), now).toMinutes();
        if (minutesSinceLastEscalation < ESCALATION_STEP_MINUTES) {
            return null;
        }

        return nextEscalation(lastType);
    }

    private EscalationType nextEscalation(EscalationType current) {
        return switch (current) {
            case LEVEL_1 -> EscalationType.LEVEL_2;
            case LEVEL_2 -> EscalationType.LEVEL_3;
            case LEVEL_3 -> null;
            case SEPSIS_ALERT -> EscalationType.LEVEL_1;
        };
    }

    private void emitEscalation(TriageQueueItem queueItem, EscalationType escalationType, LocalDateTime now) {
        EscalationEvent escalationEvent = new EscalationEvent();
        escalationEvent.setQueueItem(queueItem);
        escalationEvent.setEscalationType(escalationType);
        escalationEvent.setTriggeredAt(now);
        escalationEvent.setAcknowledged(false);
        escalationEvent.setMessage(buildEscalationMessage(queueItem, escalationType));
        escalationEventRepository.save(escalationEvent);

        queueItem.setLastEscalationType(escalationType);
        queueItem.setLastEscalationAt(now);
        queueItemRepository.save(queueItem);

        logger.warn(
                "Escalation {} emitted for queue item {} (patient {})",
                escalationType,
                queueItem.getId(),
                queueItem.getAssessment().getPatientId()
        );
    }

    private String buildEscalationMessage(TriageQueueItem queueItem, EscalationType escalationType) {
        if (escalationType == EscalationType.SEPSIS_ALERT) {
            return "Possible sepsis detected for patient " + queueItem.getAssessment().getPatientId()
                    + ". Immediate medical review required.";
        }

        return "Queue item " + queueItem.getId()
                + " for patient " + queueItem.getAssessment().getPatientId()
                + " has exceeded SLA. Escalation " + escalationType + " triggered.";
    }

    private TriageQueueItem getQueueItemOrThrow(Long queueItemId) {
        return queueItemRepository.findById(queueItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Triage queue item not found with id: " + queueItemId));
    }

    private Long selectLeastLoadedDoctorId() {
        List<Long> candidateDoctorIds = userDirectoryClient.getDoctorIds();
        if (candidateDoctorIds == null || candidateDoctorIds.isEmpty()) {
            return null;
        }

        List<QueueStatus> activeStatuses = List.of(QueueStatus.WAITING, QueueStatus.IN_PROGRESS);
        Long selectedDoctorId = null;
        long lowestActiveCases = Long.MAX_VALUE;

        for (Long candidateDoctorId : candidateDoctorIds) {
            if (candidateDoctorId == null || candidateDoctorId <= 0) {
                continue;
            }

            long activeCases = queueItemRepository.countByAssignedDoctorIdAndStatusIn(candidateDoctorId, activeStatuses);
            if (selectedDoctorId == null
                    || activeCases < lowestActiveCases
                    || (activeCases == lowestActiveCases && candidateDoctorId < selectedDoctorId)) {
                selectedDoctorId = candidateDoctorId;
                lowestActiveCases = activeCases;
            }
        }

        return selectedDoctorId;
    }

    private ScoreResult computeScoreResult(TriageAssessment assessment) {
        int score = 0;

        if (Boolean.TRUE.equals(assessment.getRespiratoryDistress())) {
            score += 3;
        }

        Integer spo2 = assessment.getSpo2();
        if (spo2 != null) {
            if (spo2 <= 90) {
                score += 3;
            } else if (spo2 <= 94) {
                score += 2;
            }
        }

        Integer systolicBp = assessment.getSystolicBp();
        if (systolicBp != null) {
            if (systolicBp < 90 || systolicBp > 180) {
                score += 3;
            } else if (systolicBp < 100 || systolicBp > 160) {
                score += 2;
            }
        }

        Integer heartRate = assessment.getHeartRate();
        if (heartRate != null) {
            if (heartRate < 40 || heartRate > 130) {
                score += 2;
            } else if (heartRate > 110) {
                score += 1;
            }
        }

        Integer painScore = assessment.getPainScore();
        if (painScore != null && painScore >= 8) {
            score += 1;
        }

        Integer age = assessment.getAge();
        if (age != null && age >= 75) {
            score += 1;
        }

        if (Boolean.TRUE.equals(assessment.getSevereComorbidity())) {
            score += 1;
        }

        SepsisSignal sepsisSignal = evaluateSepsisSignal(assessment);
        if (sepsisSignal.suspected()) {
            int minimumScore = sepsisSignal.critical() ? 7 : 5;
            score = Math.max(score, minimumScore);
        }

        TriageLevel level;
        int maxWait;
        if (score >= 7) {
            level = TriageLevel.RED;
            maxWait = 0;
        } else if (score >= 5) {
            level = TriageLevel.ORANGE;
            maxWait = 10;
        } else if (score >= 3) {
            level = TriageLevel.YELLOW;
            maxWait = 30;
        } else {
            level = TriageLevel.GREEN;
            maxWait = 120;
        }

        return new ScoreResult(score, level, maxWait, sepsisSignal.suspected());
    }

    private SepsisSignal evaluateSepsisSignal(TriageAssessment assessment) {
        int criteria = 0;

        if (Boolean.TRUE.equals(assessment.getRespiratoryDistress())) {
            criteria++;
        }

        Integer systolicBp = assessment.getSystolicBp();
        if (systolicBp != null && systolicBp <= 100) {
            criteria++;
        }

        Integer heartRate = assessment.getHeartRate();
        if (heartRate != null && heartRate >= 110) {
            criteria++;
        }

        Integer spo2 = assessment.getSpo2();
        if (spo2 != null && spo2 <= 92) {
            criteria++;
        }

        boolean critical = (systolicBp != null && systolicBp < 90)
                || (Boolean.TRUE.equals(assessment.getRespiratoryDistress()) && spo2 != null && spo2 <= 90)
                || criteria >= 3;

        boolean suspected = critical || criteria >= 2;
        return new SepsisSignal(suspected, critical);
    }

    private int defaultMaxWait(TriageLevel triageLevel) {
        return switch (triageLevel) {
            case RED -> 0;
            case ORANGE -> 10;
            case YELLOW -> 30;
            case GREEN -> 120;
        };
    }

    private double ratio(long numerator, long denominator) {
        if (denominator == 0) {
            return 0.0;
        }
        return ((double) numerator / denominator) * 100.0;
    }

    private double clamp(double value) {
        return Math.max(0.0, Math.min(100.0, value));
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record ScoreResult(int score, TriageLevel level, int maxWaitMinutes, boolean sepsisAlert) {
    }

    private record SepsisSignal(boolean suspected, boolean critical) {
    }

    private static class DoctorEfficiencyAccumulator {
        long assignedCases;
        long completedCases;
        long slaRespectedCases;
        long startDelayTotal;
        long treatmentMinutesTotal;
        long treatmentSamples;
        long highAcuityCases;
    }
}
