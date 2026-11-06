package org.example.hospitalizationservice.service;

import org.example.hospitalizationservice.entities.Room;
import org.example.hospitalizationservice.repository.RoomRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoomService {

    private final RoomRepository repository;

    public RoomService(RoomRepository repository) {
        this.repository = repository;
    }

    // ── All rooms with live occupancy + availability flag ─────────────────
    // Uses a single subquery-based JPQL — no lazy loading, no N+1.
    public List<Room> findAllWithStatus() {
        return repository.findAllWithOccupancy().stream().map(row -> {
            Room room = (Room) row[0];
            long occ  = (Long) row[1];
            room.setCurrentOccupancy((int) occ);
            room.setAvailable(occ < room.getCapacity());
            return room;
        }).toList();
    }

    // ── Available rooms only ──────────────────────────────────────────────
    public List<Room> findAvailableRooms() {
        // findAvailableRooms() only returns rooms WHERE capacity > activeCount,
        // so we know they're available. We still populate transient fields
        // by querying occupancy via countActiveByRoomId (no lazy loading).
        return repository.findAvailableRooms().stream().map(room -> {
            long occ = repository.countActiveByRoomId(room.getId());
            room.setCurrentOccupancy((int) occ);
            room.setAvailable(true);
            return room;
        }).toList();
    }

    public Room findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found: " + id));
    }

    public Room save(Room room) {
        if (room.getId() == null && repository.existsByRoomNumber(room.getRoomNumber())) {
            throw new IllegalArgumentException(
                    "Room number '" + room.getRoomNumber() + "' already exists");
        }
        return repository.save(room);
    }

    public Room update(Long id, Room room) {
        Room existing = findById(id);
        existing.setRoomNumber(room.getRoomNumber());
        existing.setType(room.getType());
        existing.setCapacity(room.getCapacity());
        existing.setDescription(room.getDescription());
        return repository.save(existing);
    }

    public void deleteById(Long id) {
        // Use a COUNT query — do NOT call room.getHospitalizations() (lazy!)
        long activeCount = repository.countActiveByRoomId(id);
        if (activeCount > 0) {
            throw new IllegalStateException(
                    "Cannot delete room with active or pending patients");
        }
        repository.deleteById(id);
    }

    // ── Used by the controller for the availability race-condition check ──
    public long countActive(Long roomId) {
        return repository.countActiveByRoomId(roomId);
    }
}