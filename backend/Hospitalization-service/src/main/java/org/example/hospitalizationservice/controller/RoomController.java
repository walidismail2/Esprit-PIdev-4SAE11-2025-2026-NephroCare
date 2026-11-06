package org.example.hospitalizationservice.controller;

import jakarta.validation.Valid;
import org.example.hospitalizationservice.entities.Room;
import org.example.hospitalizationservice.service.RoomService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService service;

    public RoomController(RoomService service) {
        this.service = service;
    }

    /**
     * GET /api/rooms
     * Returns ALL rooms with their current occupancy + availability flag.
     * Used by the admin Room management page.
     */
    @GetMapping
    public List<Room> getAll() {
        return service.findAllWithStatus();
    }

    /**
     * GET /api/rooms/available
     * Returns ONLY rooms that still have free capacity.
     * Used by the "Add Hospitalization" form to populate the room picker.
     */
    @GetMapping("/available")
    public List<Room> getAvailable() {
        return service.findAvailableRooms();
    }

    @GetMapping("/{id}")
    public Room getById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public Room create(@Valid @RequestBody Room room) {
        return service.save(room);
    }

    @PutMapping("/{id}")
    public Room update(@PathVariable Long id, @Valid @RequestBody Room room) {
        return service.update(id, room);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        service.deleteById(id); // throws IllegalStateException if occupied
        return ResponseEntity.ok(Map.of("message", "Room deleted successfully"));
    }
}