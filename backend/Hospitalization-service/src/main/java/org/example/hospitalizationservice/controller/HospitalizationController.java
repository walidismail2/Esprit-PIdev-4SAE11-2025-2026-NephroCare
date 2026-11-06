package org.example.hospitalizationservice.controller;

import jakarta.validation.Valid;
import org.example.hospitalizationservice.entities.Hospitalization;
import org.example.hospitalizationservice.entities.Room;
import org.example.hospitalizationservice.service.HospitalizationService;
import org.example.hospitalizationservice.service.RoomService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hospitalizations")
public class HospitalizationController {

    private final HospitalizationService service;
    private final RoomService            roomService;

    public HospitalizationController(HospitalizationService service,
                                     RoomService roomService) {
        this.service     = service;
        this.roomService = roomService;
    }

    @GetMapping
    public List<Hospitalization> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Hospitalization getById(@PathVariable Long id) {
        return service.findById(id);
    }

    // ── Filtered list endpoints (optional convenience) ─────────────────────
    @GetMapping("/by-status/{status}")
    public List<Hospitalization> getByStatus(@PathVariable String status) {
        return service.findByStatus(status);
    }

    @GetMapping("/by-room/{roomId}")
    public List<Hospitalization> getByRoom(@PathVariable Long roomId) {
        return service.findByRoomId(roomId);
    }

    // ── CREATE ─────────────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody Hospitalization hospitalization) {

        if (hospitalization.getRoom() == null || hospitalization.getRoom().getId() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "A room must be selected"));
        }

        Long roomId = hospitalization.getRoom().getId();
        Room room   = roomService.findById(roomId);

        // Race-condition guard: re-check availability at write time
        // Uses a COUNT query — NO lazy loading of room.getHospitalizations()
        long activeCount = roomService.countActive(roomId);
        if (activeCount >= room.getCapacity()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Room " + room.getRoomNumber() + " is no longer available"
            ));
        }

        hospitalization.setRoom(room);
        return ResponseEntity.ok(service.save(hospitalization));
    }

    // ── UPDATE ─────────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @Valid @RequestBody Hospitalization hospitalization) {

        // Ensure the entity being updated actually exists
        service.findById(id); // throws 404 if not found
        hospitalization.setId(id);

        // Re-resolve the room if the request includes a room id
        if (hospitalization.getRoom() != null && hospitalization.getRoom().getId() != null) {
            Room room = roomService.findById(hospitalization.getRoom().getId());
            hospitalization.setRoom(room);
        }

        return ResponseEntity.ok(service.save(hospitalization));
    }

    // ── DELETE ─────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        service.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Hospitalization deleted"));
    }
}