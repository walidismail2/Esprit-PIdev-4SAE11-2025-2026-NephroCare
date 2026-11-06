package org.example.hospitalizationservice.repository;

import org.example.hospitalizationservice.entities.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {

    Optional<Room> findByRoomNumber(String roomNumber);

    boolean existsByRoomNumber(String roomNumber);

    // ── Available rooms: capacity > active+pending count ──────────────────
    // Uses a correlated subquery — valid JPQL, no JOIN ON needed.
    @Query("""
        SELECT r FROM Room r
        WHERE r.capacity > (
            SELECT COUNT(h) FROM Hospitalization h
            WHERE h.room = r
              AND h.status IN ('active', 'pending')
        )
        ORDER BY r.type, r.roomNumber
    """)
    List<Room> findAvailableRooms();

    // ── All rooms + their active/pending occupancy in one query ───────────
    // Returns [Room, Long] pairs.  Uses a correlated subquery in SELECT
    // because JPQL LEFT JOIN ON with a WHERE condition inside is not valid.
    @Query("""
        SELECT r,
          (SELECT COUNT(h) FROM Hospitalization h
           WHERE h.room = r AND h.status IN ('active', 'pending'))
        FROM Room r
        ORDER BY r.roomNumber
    """)
    List<Object[]> findAllWithOccupancy();

    // ── Count active+pending hospitalizations for a specific room ─────────
    // Used by the controller availability check to avoid lazy-loading issues.
    @Query("""
        SELECT COUNT(h) FROM Hospitalization h
        WHERE h.room.id = :roomId
          AND h.status IN ('active', 'pending')
    """)
    long countActiveByRoomId(@Param("roomId") Long roomId);
}