import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteDayAssignment, getAllDayAssignments, saveDayAssignments } from '../db/database';
import { createDayAssignment, withEvenHours, type DayAssignment } from '../types/dayAssignment';
import type { WorkLocation } from '../types/workLocation';

export function useDayAssignments() {
  const [assignments, setAssignments] = useState<DayAssignment[] | null>(null);

  useEffect(() => {
    getAllDayAssignments().then(setAssignments);
  }, []);

  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, DayAssignment[]>();
    for (const assignment of assignments ?? []) {
      const list = map.get(assignment.date);
      if (list) {
        list.push(assignment);
      } else {
        map.set(assignment.date, [assignment]);
      }
    }
    return map;
  }, [assignments]);

  const addAssignment = useCallback(
    async (date: string, projectId: string, location: WorkLocation | null = null) => {
      const current = assignments?.filter((a) => a.date === date) ?? [];
      const next = withEvenHours([...current, createDayAssignment(date, projectId, 0, location)]);
      await saveDayAssignments(next);
      setAssignments((prev) => [...(prev ?? []).filter((a) => a.date !== date), ...next]);
    },
    [assignments],
  );

  const removeAssignment = useCallback(async (id: string) => {
    const target = assignments?.find((a) => a.id === id);
    await deleteDayAssignment(id);
    const remaining = withEvenHours(assignments?.filter((a) => a.date === target?.date && a.id !== id) ?? []);
    await saveDayAssignments(remaining);
    setAssignments((prev) =>
      (prev ?? [])
        .filter((a) => a.id !== id)
        .map((a) => remaining.find((r) => r.id === a.id) ?? a),
    );
  }, [assignments]);

  const setHours = useCallback(async (updated: DayAssignment[]) => {
    await saveDayAssignments(updated);
    setAssignments((prev) => (prev ?? []).map((a) => updated.find((u) => u.id === a.id) ?? a));
  }, []);

  return { assignments, assignmentsByDate, addAssignment, removeAssignment, setHours };
}
