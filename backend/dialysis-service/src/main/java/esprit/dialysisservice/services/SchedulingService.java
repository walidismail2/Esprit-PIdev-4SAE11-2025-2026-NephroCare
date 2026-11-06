package esprit.dialysisservice.services;

import esprit.dialysisservice.dtos.response.NurseResponseDTO;
import esprit.dialysisservice.dtos.response.ScheduledSessionResponseDTO;
import esprit.dialysisservice.dtos.schedule.ConfirmScheduleRequestDTO;
import esprit.dialysisservice.entities.DialysisTreatment;
import esprit.dialysisservice.entities.ScheduledSession;
import esprit.dialysisservice.entities.enums.DialysisShift;
import esprit.dialysisservice.entities.enums.NotificationType;
import esprit.dialysisservice.entities.enums.NurseConfirmationStatus;
import esprit.dialysisservice.entities.enums.ScheduledStatus;
import esprit.dialysisservice.mapper.ScheduledSessionMapper;
import esprit.dialysisservice.repositories.DialysisTreatmentRepository;
import esprit.dialysisservice.repositories.ScheduledSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class SchedulingService {

    private final DialysisTreatmentRepository treatmentRepository;
    private final ScheduledSessionRepository scheduledRepo;
    private final NotificationService notificationService;
    private final UserService userService;
    private final ScheduledSessionMapper mapper;

    @Transactional
    public List<ScheduledSessionResponseDTO> confirm(ConfirmScheduleRequestDTO req, UUID createdBySub) {

        if (req == null || req.getTreatmentId() == null)
            throw new ResponseStatusException(BAD_REQUEST, "treatmentId required");

        if (req.getSlots() == null || req.getSlots().isEmpty())
            throw new ResponseStatusException(BAD_REQUEST, "slots required");

        DialysisTreatment t = treatmentRepository.findById(req.getTreatmentId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Treatment not found"));

        if (t.getPatientId() == null)
            throw new ResponseStatusException(CONFLICT, "Treatment has no patientId");

        if (t.getStatus() == null || !"ACTIVE".equalsIgnoreCase(t.getStatus().name()))
            throw new ResponseStatusException(CONFLICT, "Treatment not ACTIVE");

        for (var slot : req.getSlots()) {
            if (slot.getDay() == null || slot.getShift() == null)
                throw new ResponseStatusException(BAD_REQUEST, "day/shift required");

            if (slot.getNurseId() == null)
                throw new ResponseStatusException(BAD_REQUEST, "nurseId required");

            if (slot.getDay().isBefore(LocalDate.now()))
                throw new ResponseStatusException(CONFLICT, "Cannot schedule in the past");

            if (scheduledRepo.existsByTreatmentIdAndDayAndShift(req.getTreatmentId(), slot.getDay(), slot.getShift()))
                throw new ResponseStatusException(CONFLICT, "Already scheduled for that treatment/day/shift");

            boolean nurseBusy = scheduledRepo.existsByNurseIdAndDayAndShiftAndStatusIn(
                    slot.getNurseId(),
                    slot.getDay(),
                    slot.getShift(),
                    List.of(ScheduledStatus.SCHEDULED, ScheduledStatus.STARTED)
            );
            if (nurseBusy)
                throw new ResponseStatusException(CONFLICT, "Nurse already scheduled in that slot");
        }

        List<ScheduledSessionResponseDTO> created = new ArrayList<>();

        for (var slot : req.getSlots()) {
            ScheduledSession s = ScheduledSession.builder()
                    .treatmentId(req.getTreatmentId())
                    .patientId(t.getPatientId())
                    .day(slot.getDay())
                    .shift(slot.getShift())
                    .nurseId(slot.getNurseId())
                    .status(ScheduledStatus.SCHEDULED)
                    .nurseConfirmation(NurseConfirmationStatus.PENDING)
                    .lastAssignmentAt(LocalDateTime.now())
                    .createdAt(LocalDateTime.now())
                    .createdBy(createdBySub != null ? createdBySub.toString() : null)
                    .build();

            ScheduledSession saved = scheduledRepo.save(s);

            notificationService.push(
                    saved.getNurseId(),
                    NotificationType.SCHEDULE_REQUEST,
                    "New dialysis assignment request",
                    "You have a new assignment on " + saved.getDay() + " (" + saved.getShift() + "). Please accept or reject.",
                    "SCHEDULED_SESSION",
                    saved.getId(),
                    Map.of(
                            "scheduledSessionId", saved.getId().toString(),
                            "day", saved.getDay().toString(),
                            "shift", saved.getShift().name()
                    )
            );

            created.add(mapper.toResponse(saved));
        }

        return created;
    }

    public List<ScheduledSessionResponseDTO> getMyToday(UUID nurseId) {
        LocalDate today = LocalDate.now();
        return scheduledRepo.findAllByNurseIdAndDayBetweenOrderByDayAscShiftAsc(nurseId, today, today).stream()
                .filter(this::visibleInSchedule)
                .map(mapper::toResponse)
                .toList();
    }

    public List<ScheduledSessionResponseDTO> getMyBetween(UUID nurseId, LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "from/to required");
        }
        if (to.isBefore(from)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "to must be >= from");
        }

        return scheduledRepo.findAllByNurseIdAndDayBetweenOrderByDayAscShiftAsc(nurseId, from, to).stream()
                .filter(this::visibleInSchedule)
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScheduledSessionResponseDTO> getMyPendingAssignments(UUID nurseId) {
        return scheduledRepo.findByNurseIdAndNurseConfirmationAndDayGreaterThanEqualOrderByDayAsc(
                        nurseId, NurseConfirmationStatus.PENDING, LocalDate.now())
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional
    public ScheduledSessionResponseDTO nurseAccept(UUID scheduledSessionId, UUID nurseId) {
        ScheduledSession s = scheduledRepo.findById(scheduledSessionId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Scheduled session not found"));

        if (s.getNurseId() == null || !s.getNurseId().equals(nurseId)) {
            throw new ResponseStatusException(FORBIDDEN, "You can only respond to your assignments");
        }
        if (s.getStatus() != ScheduledStatus.SCHEDULED) {
            throw new ResponseStatusException(CONFLICT, "Assignment is not in SCHEDULED state");
        }
        if (s.getNurseConfirmation() != NurseConfirmationStatus.PENDING) {
            throw new ResponseStatusException(CONFLICT, "Assignment has already been processed");
        }

        s.setNurseConfirmation(NurseConfirmationStatus.ACCEPTED);
        s.setNurseConfirmedAt(LocalDateTime.now());
        s.setNurseRejectedReason(null);

        ScheduledSession saved = scheduledRepo.save(s);

        notifyCreatorAndDoctor(saved,
                NotificationType.SCHEDULE_ACCEPTED,
                "Assignment accepted",
                "Nurse accepted assignment on " + saved.getDay() + " (" + saved.getShift() + ").");

        return mapper.toResponse(saved);
    }

    @Transactional
    public ScheduledSessionResponseDTO nurseRejectAndAutoReassign(UUID scheduledSessionId, UUID nurseId, String reason) {
        ScheduledSession s = scheduledRepo.findById(scheduledSessionId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Scheduled session not found"));

        if (s.getNurseId() == null || !s.getNurseId().equals(nurseId)) {
            throw new ResponseStatusException(FORBIDDEN, "You can only respond to your assignments");
        }
        if (s.getStatus() != ScheduledStatus.SCHEDULED) {
            throw new ResponseStatusException(CONFLICT, "Assignment is not in SCHEDULED state");
        }
        if (s.getNurseConfirmation() != NurseConfirmationStatus.PENDING) {
            throw new ResponseStatusException(CONFLICT, "Assignment has already been processed");
        }

        s.setNurseConfirmation(NurseConfirmationStatus.REJECTED);
        s.setNurseConfirmedAt(LocalDateTime.now());
        s.setNurseRejectedReason((reason != null && !reason.isBlank()) ? reason : "No reason provided");
        scheduledRepo.save(s);

        UUID newNurse = findAlternativeNurse(s.getDay(), s.getShift(), s.getNurseId());

        if (newNurse == null) {
            notifyCreatorAndDoctor(s,
                    NotificationType.SCHEDULE_REJECTED,
                    "Assignment rejected (no replacement found)",
                    "Nurse rejected assignment on " + s.getDay() + " (" + s.getShift() + "). No free nurse found. Reassign manually.");
            return mapper.toResponse(s);
        }

        UUID oldNurse = s.getNurseId();

        s.setReassignedFromNurseId(oldNurse);
        s.setNurseId(newNurse);
        s.setNurseConfirmation(NurseConfirmationStatus.PENDING);
        s.setNurseConfirmedAt(null);
        s.setNurseRejectedReason(null);
        s.setLastAssignmentAt(LocalDateTime.now());

        ScheduledSession reassigned = scheduledRepo.save(s);

        notifyCreator(reassigned,
                NotificationType.SCHEDULE_REASSIGNED,
                "Auto-reassigned after rejection",
                "Nurse rejected assignment. Auto-reassigned to another nurse for " + reassigned.getDay() + " (" + reassigned.getShift() + ").");

        notificationService.push(
                reassigned.getNurseId(),
                NotificationType.SCHEDULE_REQUEST,
                "New dialysis assignment request (auto-reassigned)",
                "You have a new assignment on " + reassigned.getDay() + " (" + reassigned.getShift() + "). Please accept or reject.",
                "SCHEDULED_SESSION",
                reassigned.getId(),
                Map.of(
                        "scheduledSessionId", reassigned.getId().toString(),
                        "day", reassigned.getDay().toString(),
                        "shift", reassigned.getShift().name(),
                        "auto", true
                )
        );

        return mapper.toResponse(reassigned);
    }

    private boolean visibleInSchedule(ScheduledSession s) {
        if (s == null) return false;

        boolean validStatus = s.getStatus() == ScheduledStatus.SCHEDULED || s.getStatus() == ScheduledStatus.STARTED;
        boolean validConfirmation = s.getNurseConfirmation() == NurseConfirmationStatus.PENDING
                || s.getNurseConfirmation() == NurseConfirmationStatus.ACCEPTED;

        return validStatus && validConfirmation;
    }

    private List<UUID> listAllNurseIds() {
        return userService.getNurses().stream()
                .map(NurseResponseDTO::getId)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(id -> {
                    try {
                        return UUID.fromString(id);
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private UUID findAlternativeNurse(LocalDate day, DialysisShift shift, UUID rejectedNurse) {
        List<UUID> allNurses = listAllNurseIds();
        if (allNurses.isEmpty()) return null;

        for (UUID candidate : allNurses) {
            if (candidate.equals(rejectedNurse)) continue;

            boolean busy = scheduledRepo.existsByNurseIdAndDayAndShiftAndStatusInAndNurseConfirmationIn(
                    candidate,
                    day,
                    shift,
                    List.of(ScheduledStatus.SCHEDULED, ScheduledStatus.STARTED),
                    List.of(NurseConfirmationStatus.PENDING, NurseConfirmationStatus.ACCEPTED)
            );

            if (!busy) return candidate;
        }
        return null;
    }

    private void notifyCreator(ScheduledSession s, NotificationType type, String title, String message) {
        try {
            if (s.getCreatedBy() == null) return;
            UUID creator = UUID.fromString(s.getCreatedBy());
            notificationService.push(
                    creator,
                    type,
                    title,
                    message,
                    "SCHEDULED_SESSION",
                    s.getId(),
                    Map.of("scheduledSessionId", s.getId().toString())
            );
        } catch (Exception ignored) {
        }
    }

    private void notifyCreatorAndDoctor(ScheduledSession s,
                                        NotificationType type,
                                        String title,
                                        String message) {

        UUID creator = null;
        try {
            if (s.getCreatedBy() != null) creator = UUID.fromString(s.getCreatedBy());
        } catch (Exception ignored) {
        }

        if (creator != null) {
            notificationService.push(
                    creator,
                    type,
                    title,
                    message,
                    "SCHEDULED_SESSION",
                    s.getId(),
                    Map.of("scheduledSessionId", s.getId().toString())
            );
        }

        try {
            DialysisTreatment t = treatmentRepository.findById(s.getTreatmentId()).orElse(null);
            if (t != null && t.getDoctorId() != null) {
                UUID doctorId = t.getDoctorId();

                if (creator == null || !doctorId.equals(creator)) {
                    notificationService.push(
                            doctorId,
                            type,
                            title,
                            message,
                            "SCHEDULED_SESSION",
                            s.getId(),
                            Map.of("scheduledSessionId", s.getId().toString())
                    );
                }
            }
        } catch (Exception ignored) {
        }
    }
}