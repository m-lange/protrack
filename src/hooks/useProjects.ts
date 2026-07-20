import { useCallback, useEffect, useState } from 'react';
import { deleteProject, getAllProjects, saveProject } from '../db/database';
import type { Project } from '../types/project';

function byOrder(a: Project, b: Project): number {
  return a.order - b.order;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    getAllProjects().then((loaded) => {
      setProjects([...loaded].sort(byOrder));
    });
  }, []);

  const nextOrder = useCallback(() => {
    const current = projects ?? [];
    return current.length === 0 ? 0 : Math.max(...current.map((p) => p.order)) + 1;
  }, [projects]);

  const upsertProject = useCallback(async (project: Project) => {
    await saveProject(project);
    setProjects((prev) => {
      const others = (prev ?? []).filter((p) => p.id !== project.id);
      return [...others, project].sort(byOrder);
    });
  }, []);

  const removeProject = useCallback(async (id: string) => {
    await deleteProject(id);
    setProjects((prev) => (prev ?? []).filter((p) => p.id !== id));
  }, []);

  const moveProject = useCallback(
    // `scope` restricts the swap to a subset (e.g. only active or only archived projects) so the
    // two lists, despite sharing the same `order` numbering, never swap a project past a boundary
    // it can't see in its own list.
    async (id: string, direction: 'up' | 'down', scope?: Project[]) => {
      const list = [...(scope ?? projects ?? [])].sort(byOrder);
      const index = list.findIndex((p) => p.id === id);
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (index === -1 || swapIndex < 0 || swapIndex >= list.length) {
        return;
      }

      const a = list[index];
      const b = list[swapIndex];
      const swappedA = { ...a, order: b.order };
      const swappedB = { ...b, order: a.order };
      setProjects((prev) =>
        (prev ?? []).map((p) => (p.id === a.id ? swappedA : p.id === b.id ? swappedB : p)).sort(byOrder),
      );

      try {
        await Promise.all([saveProject(swappedA), saveProject(swappedB)]);
      } catch (error) {
        // Revert the optimistic swap so the UI matches what's actually in storage.
        setProjects((prev) => (prev ?? []).map((p) => (p.id === a.id ? a : p.id === b.id ? b : p)).sort(byOrder));
        throw error;
      }
    },
    [projects],
  );

  return { projects, upsertProject, removeProject, moveProject, nextOrder };
}
